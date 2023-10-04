import { program } from "commander";
import { WebflowWrapper } from "./services/webflow-wrapper";
import { printSectionTitle } from "./utils/console-util";

export function registerListSitesCommand(): void {
  program
    .command("list-sites")
    .requiredOption("--apiKey <apikey>", "Webflow API key must be specified")
    .description("Get the site IDs for your Webflow sites.")
    .action(listSites);
}

async function listSites(args: { apiKey: string }): Promise<void> {
  printSectionTitle("Looking for your Webflow sites");
  const webflow = new WebflowWrapper(args.apiKey);

  const allSites = await webflow.getAllSites();
  for (const site of allSites) {
    console.log(`${site.name}: ${site._id}`);
  }
}
