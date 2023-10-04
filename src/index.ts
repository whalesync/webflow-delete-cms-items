#!/usr/bin/env node
import { program } from "commander";
import { registerEmptyWebflowCommand } from "./empty-webflow";
import { registerListSitesCommand } from "./list-webflow-sites";
import { printSectionTitle } from "./utils/console-util";

// Command-line flag options. See for more details:
// https://www.npmjs.com/package/commander

printSectionTitle("Shameless plug: Whalesync");
console.log(
  "If you want an easy way to manage your Webflow CMS, check out www.whalesync.com!"
);

registerListSitesCommand();
registerEmptyWebflowCommand();

// Run the program.
program.parse();
