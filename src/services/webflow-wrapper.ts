import * as _ from "lodash";
import Webflow from "webflow-api";
import { ApiThrottler } from "../utils/api-throttler";
import { printErrorAndDie, printSuccess } from "../utils/console-util";
import { RecordWithCollection } from "./types";

// See: https://developers.webflow.com/reference/list-items
export class WebflowWrapper {
  private webflow: Webflow;
  private apiLimiter = new ApiThrottler(1000);

  constructor(apiKey: string) {
    this.webflow = new Webflow({ token: apiKey });
  }

  async getAllSites(): Promise<Webflow.WebflowApiModel.Site[]> {
    await this.apiLimiter.consumeQuota();
    return this.webflow.sites();
  }

  async getCollections(
    siteId: string
  ): Promise<Webflow.WebflowApiModel.Collection[]> {
    await this.apiLimiter.consumeQuota();
    const collections = await this.webflow.collections({ siteId });
    console.log(`Found ${collections.length} collections in site ${siteId}`);
    return collections;
  }

  async getAllCollectionsForSites(
    siteIds: string[]
  ): Promise<Webflow.WebflowApiModel.Collection[]> {
    return (
      await Promise.all(siteIds.map((siteId) => this.getCollections(siteId)))
    ).flat();
  }

  async republishSites(sites: Webflow.WebflowApiModel.Site[]): Promise<void> {
    for (const site of sites) {
      const domainIdsList = [`${site.shortName}.webflow.io`];
      // Webflow's publish site endpoint has a **1 minute rate limit**.
      console.log(
        "Publishing your Webflow site. Webflow's publish site endpoint has a 1 minute rate limit. Sleeping for 1 minute..."
      );
      await this.apiLimiter.consumeQuota(60 * 1000 /* 60 seconds */);
      console.log("Sleep finished.");
      const response = await this.webflow.publishSite({
        siteId: site._id,
        domains: domainIdsList,
      });
      if (response.queued !== true) {
        printErrorAndDie(
          `Problem republishing site! ${JSON.stringify(response, null, 2)}`
        );
      }
      printSuccess(`Republished ${domainIdsList.join(", ")}`);
    }
  }

  async getItems(collectionIds: string[]): Promise<RecordWithCollection[]> {
    const result = [];
    for (const collectionId of collectionIds) {
      let offset = 0;
      while (true) {
        await this.apiLimiter.consumeQuota();
        const response = await this.webflow.items(
          { collectionId: collectionId },
          { limit: 100, offset }
        );
        result.push(
          ...response.items.map((i) => {
            const newItem: RecordWithCollection = {
              collectionId: collectionId,
              itemId: i._id,
              // NOTE: We need to filter out functions since there's some callbacks like 'update()' in there.
              fields: _.omitBy(i, (v) => typeof v === "function"),
            };
            return newItem;
          })
        );
        offset += response.count;
        console.log(
          `Found ${response.items.length} items in collection ${collectionId}, offset = ${offset}`
        );
        if (offset >= response.total) {
          break;
        }
      }
    }
    printSuccess(`Found a total of ${result.length} items`);
    return result;
  }

  async useAndCheckQuota(
    collectionId: string
  ): Promise<{ limit: number; remaining: number }> {
    await this.apiLimiter.consumeQuota();
    const x = await this.webflow.collection({ collectionId });
    return _.get(x, "_meta.rateLimit") as unknown as {
      limit: number;
      remaining: number;
    };
  }

  async deleteItems(items: RecordWithCollection[]): Promise<void> {
    for (let i = 0; i < items.length; ) {
      const item = items[i];
      const modified = this.clearReferenceFieldsAndRemoveAllOthers(item);
      if (modified) {
        try {
          await this.apiLimiter.consumeQuota();
          await this.webflow.patchItem(
            {
              collectionId: item.collectionId,
              itemId: item.itemId,
              fields: item.fields,
            },
            item.fields["published-on"] ? { live: "true" } : {}
          );
          console.log(`Cleared reference fields for item ${item.itemId}`);
        } catch (error) {
          const code = _.get(error, "code");
          if (code === 429) {
            // We're hitting a rate limit. Will wait for 30 seconds.
            console.log("Hit a rate limit error. Waiting for 30 seconds...");
            continue;
          } else {
            printErrorAndDie(
              `Hit an error on webflow.patchItem(): ${code}: ${error}`
            );
          }
        }
      }
      i++;
    }

    for (let i = 0; i < items.length; ) {
      const item = items[i];
      try {
        await this.apiLimiter.consumeQuota();
        const response = await this.webflow.removeItem({
          collectionId: item.collectionId,
          itemId: item.itemId,
        });
        if (!response.deleted || response.deleted < 1) {
          printErrorAndDie(
            `Couldn't delete ${JSON.stringify(response, null, 2)}`
          );
        } else {
          console.log(`Deleted item ${item.itemId}`);
        }
      } catch (error) {
        const code = _.get(error, "code");
        if (code === 429) {
          // We're hitting a rate limit. Will wait for 30 seconds.
          console.log("Hit a rate limit error. Waiting for 30 seconds...");
          continue;
        } else {
          printErrorAndDie(
            `Hit an error on webflow.removeItem() ${code}: ${error}: collectionId: ${item.collectionId} itemId: ${item.itemId}`
          );
        }
      }
      i++;
    }
    printSuccess(`Deleted ${items.length} items`);
  }

  /** Returns true if a reference field was modified. */
  private clearReferenceFieldsAndRemoveAllOthers(
    item: RecordWithCollection
  ): boolean {
    let modified = false;
    const newFields: { [x: string]: unknown } = {
      _archived: item.fields["_archived"],
      _draft: item.fields["_draft"],
      name: item.fields["name"],
      slug: item.fields["slug"],
    };
    for (const [key, value] of Object.entries(item.fields)) {
      if (key === "_cid" || key === "_id") {
        continue;
      }
      if (typeof value === "string" && value.length >= 24) {
        const matchRegex = /^[0-9a-f]{24,}$/;
        if (value.match(matchRegex)) {
          // It's probably a single-reference field, so null it out.
          modified = true;
          newFields[key] = null;
        }
      }

      if (
        Array.isArray(value) &&
        value.length > 0 &&
        typeof value[0] === "string" &&
        value[0].length >= 24
      ) {
        const matchRegex = /^[0-9a-f]{24,}$/;
        if (value[0].match(matchRegex)) {
          // It's probably a multi-reference field, so null it out.
          newFields[key] = [];
          modified = true;
        }
      }
    }

    item.fields = newFields;
    return modified;
  }

  async patchItem(
    collectionId: string,
    itemId: string,
    fieldsToPatch: Record<string, unknown>
  ): Promise<void> {
    await this.apiLimiter.consumeQuota();
    await this.webflow.patchItem({
      collectionId,
      itemId,
      fields: fieldsToPatch,
    });
  }

  async listWebhooks(
    siteId: string
  ): Promise<Webflow.WebflowApiModel.Webhook[]> {
    await this.apiLimiter.consumeQuota();
    const result = await this.webflow.webhooks({ siteId });
    printSuccess(`Found ${result.length} webhooks`);
    return result;
  }

  async deleteWebhook(webhook: Webflow.WebflowApiModel.Webhook): Promise<void> {
    await this.apiLimiter.consumeQuota();
    console.log(`Deleting webhook (${webhook._id})`);
    await webhook.remove();
  }
}
