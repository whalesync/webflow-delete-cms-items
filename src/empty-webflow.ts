import { program } from "commander";
import Webflow from "webflow-api";
import { WebflowWrapper } from "./services/webflow-wrapper";
import { printSectionTitle } from "./utils/console-util";

export function registerEmptyWebflowCommand(): void {
  program
    .command("empty-webflow")
    .requiredOption("--apiKey <apikey>", "Webflow API key must be specified")
    .requiredOption(
      "--siteIds <all|siteIds...>",
      'A space-separated list of site IDs to empty out, or "all" to empty all of them'
    )
    .requiredOption(
      "--collectionIds <all|collectionIds...>",
      'A space-separated list of collection IDs to empty out, or "all" to empty all of them'
    )
    .description("Remove all items from your Webflow base!")
    .action(emptyWebflow);
}

async function emptyWebflow(args: {
  apiKey: string;
  siteIds: ["all"] | string[];
  collectionIds: ["all"] | string[];
}): Promise<void> {
  if (args.collectionIds.length === 0) {
    console.error('Expected to have "collectionIds" passed in as an argument.');
    process.exit(1);
  }
  if (args.collectionIds[0] !== "all") {
    for (const id of args.collectionIds) {
      if (id.length !== 24) {
        console.error(
          `Expected to have a valid Webflow collection ID (24 characters long), but instead got ${id}.`
        );
        process.exit(1);
      }
    }
  }

  printSectionTitle("Resetting Webflow");
  const webflow = new WebflowWrapper(args.apiKey);

  const allSites = await webflow.getAllSites();
  let sites: Webflow.WebflowApiModel.Site[];
  if (args.siteIds[0].trim() === "all") {
    sites = allSites;
  } else {
    sites = allSites.filter((s) => (args.siteIds as string[]).includes(s._id));
  }
  await webflow.republishSites(sites);

  let collectionIds;
  if (args.collectionIds[0].trim() === "all") {
    collectionIds = (
      await webflow.getAllCollectionsForSites(sites.map((s) => s._id))
    ).map((c) => c._id);
  } else {
    collectionIds = args.collectionIds;
  }

  const allItems = await webflow.getItems(collectionIds);
  await webflow.deleteItems(allItems);
  await webflow.republishSites(sites);
}
