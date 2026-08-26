import { randomInt as cryptoRandomInt } from "node:crypto";

const adjectives = ["calm", "bright", "quick", "quiet", "bold", "kind"] as const;
const nouns = ["river", "forest", "cloud", "meadow", "stone", "breeze"] as const;

export function generateAlias(
  randomInt: typeof cryptoRandomInt = cryptoRandomInt,
): string {
  const adjective = adjectives[randomInt(0, adjectives.length)];
  const noun = nouns[randomInt(0, nouns.length)];
  const digits = randomInt(100, 1000);

  return `${adjective}-${noun}-${digits}`;
}
