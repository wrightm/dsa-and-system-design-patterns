import { DEFAULTS, main } from "../render-video";
process.exitCode = await main(process.argv.slice(2), DEFAULTS);
