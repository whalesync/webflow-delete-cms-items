/**
 * Helpers for styling output nicely.
 */

import chalk from "chalk";
import { exit } from "process";

export function printSectionTitle(msg: string): void {
  console.log("\n");
  console.log(chalk.yellowBright(`======== ${msg} ========`));
}

export function printError(msg: unknown): void {
  console.log(chalk.redBright(msg));
}

export function printErrorAndDie(msg: unknown): never {
  console.log(chalk.redBright(msg));
  exit(-1);
}

export function printSuccess(msg: unknown): void {
  console.log(chalk.greenBright(msg));
}
