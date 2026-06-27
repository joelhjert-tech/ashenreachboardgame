import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join, sep } from "node:path";

type CardImagePrompt = {
  assetId: string;
  assetType: string;
  cardId: string;
  cardType: string;
  title: string;
  outputPath: string;
  prompt: string;
  negativePrompt?: string;
};

type RunResult = {
  assetId: string;
  title: string;
  outputPath: string;
  status: "generated" | "failed";
  message?: string;
  bytes?: number;
  usage?: unknown;
};

type CliOptions = {
  delayMs: number;
  force: boolean;
  limit?: number;
  model: string;
  moderation: "auto" | "low";
  outputFormat: "png" | "jpeg" | "webp";
  promptFile: string;
  quality: "auto" | "low" | "medium" | "high";
  reportPath: string;
  size: string;
};

type OpenAIImageResponse = {
  data?: Array<{
    b64_json?: string;
  }>;
  error?: {
    message?: string;
    type?: string;
    code?: string;
  };
  usage?: unknown;
};

const DEFAULT_MODEL = "gpt-image-2";
const DEFAULT_REPORT_PATH = "generated/openai-card-image-report.json";
const IMAGE_GENERATIONS_URL = "https://api.openai.com/v1/images/generations";

function readOptions(): CliOptions {
  const options: CliOptions = {
    delayMs: Number(process.env.OPENAI_IMAGE_DELAY_MS ?? 1500),
    force: false,
    model: process.env.OPENAI_IMAGE_MODEL ?? DEFAULT_MODEL,
    moderation: (process.env.OPENAI_IMAGE_MODERATION ?? "auto") as CliOptions["moderation"],
    outputFormat: (process.env.OPENAI_IMAGE_OUTPUT_FORMAT ?? "png") as CliOptions["outputFormat"],
    promptFile: "generated/card-image-prompts.json",
    quality: (process.env.OPENAI_IMAGE_QUALITY ?? "medium") as CliOptions["quality"],
    reportPath: DEFAULT_REPORT_PATH,
    size: process.env.OPENAI_IMAGE_SIZE ?? "1024x1536"
  };

  const args = process.argv.slice(2);
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const nextValue = args[index + 1];

    if (arg === "--force") {
      options.force = true;
      continue;
    }

    if (!nextValue || nextValue.startsWith("--")) {
      throw new Error(`Missing value for ${arg}`);
    }

    if (arg === "--delay-ms") {
      options.delayMs = Number(nextValue);
    } else if (arg === "--limit") {
      options.limit = Number(nextValue);
    } else if (arg === "--model") {
      options.model = nextValue;
    } else if (arg === "--moderation") {
      options.moderation = nextValue as CliOptions["moderation"];
    } else if (arg === "--output-format") {
      options.outputFormat = nextValue as CliOptions["outputFormat"];
    } else if (arg === "--prompt-file") {
      options.promptFile = nextValue;
    } else if (arg === "--quality") {
      options.quality = nextValue as CliOptions["quality"];
    } else if (arg === "--report") {
      options.reportPath = nextValue;
    } else if (arg === "--size") {
      options.size = nextValue;
    } else {
      throw new Error(`Unknown option ${arg}`);
    }
    index += 1;
  }

  if (!Number.isFinite(options.delayMs) || options.delayMs < 0) {
    throw new Error("--delay-ms must be a non-negative number");
  }

  if (options.limit !== undefined && (!Number.isInteger(options.limit) || options.limit < 1)) {
    throw new Error("--limit must be a positive integer");
  }

  if (!["auto", "low"].includes(options.moderation)) {
    throw new Error("--moderation must be auto or low");
  }

  if (!["png", "jpeg", "webp"].includes(options.outputFormat)) {
    throw new Error("--output-format must be png, jpeg, or webp");
  }

  if (!["auto", "low", "medium", "high"].includes(options.quality)) {
    throw new Error("--quality must be auto, low, medium, or high");
  }

  return options;
}

function resolvePublicPath(outputPath: string): string {
  return join(process.cwd(), "public", outputPath.replace(/^\//, "").split("/").join(sep));
}

function readPromptCatalog(promptFile: string): CardImagePrompt[] {
  const prompts = JSON.parse(readFileSync(promptFile, "utf8")) as CardImagePrompt[];
  return prompts.filter((prompt) => prompt.assetId && prompt.outputPath && prompt.prompt);
}

function buildPrompt(entry: CardImagePrompt): string {
  const negativePrompt = entry.negativePrompt ? `\nAvoid: ${entry.negativePrompt}` : "";
  return [
    entry.prompt,
    "Create one finished ChatGPT Image 2.0 card-art illustration for this exact card slot.",
    "The final image must be portrait-oriented card art with a centered readable silhouette and safe margins.",
    "Do not include readable text, logos, watermarks, UI, borders, dice, tabletop components, or a card frame.",
    "Use original dark gothic sci-fantasy art direction. Avoid copying any existing game, film, comic, or artist-specific style.",
    negativePrompt
  ]
    .filter(Boolean)
    .join("\n");
}

async function generateImage(entry: CardImagePrompt, options: CliOptions, apiKey: string): Promise<{ image: Buffer; usage?: unknown }> {
  const response = await fetch(IMAGE_GENERATIONS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: options.model,
      prompt: buildPrompt(entry),
      n: 1,
      size: options.size,
      quality: options.quality,
      output_format: options.outputFormat,
      moderation: options.moderation
    })
  });

  const responseText = await response.text();
  let responseJson: OpenAIImageResponse | undefined;
  try {
    responseJson = JSON.parse(responseText) as OpenAIImageResponse;
  } catch {
    responseJson = undefined;
  }

  if (!response.ok) {
    const message = responseJson?.error?.message ?? responseText.slice(0, 500);
    throw new Error(`OpenAI image request failed (${response.status}): ${message}`);
  }

  const imageData = responseJson?.data?.[0]?.b64_json;
  if (!imageData) {
    throw new Error(`OpenAI image response did not include b64_json: ${responseText.slice(0, 500)}`);
  }

  return {
    image: Buffer.from(imageData, "base64"),
    usage: responseJson?.usage
  };
}

function writeImageAtomically(outputPath: string, image: Buffer): void {
  const destination = resolvePublicPath(outputPath);
  mkdirSync(dirname(destination), { recursive: true });
  const tempPath = `${destination}.tmp-${process.pid}`;
  writeFileSync(tempPath, image);
  renameSync(tempPath, destination);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function writeReport(reportPath: string, payload: unknown): void {
  const resolvedReportPath = join(process.cwd(), reportPath.split("/").join(sep));
  mkdirSync(dirname(resolvedReportPath), { recursive: true });
  writeFileSync(resolvedReportPath, `${JSON.stringify(payload, null, 2)}\n`);
}

async function main(): Promise<void> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not set for this process. In the same PowerShell window where you run npm, set `$env:OPENAI_API_KEY=\"...\"` first."
    );
  }

  const options = readOptions();
  const prompts = readPromptCatalog(options.promptFile);
  const missingPrompts = options.force ? prompts : prompts.filter((prompt) => !existsSync(resolvePublicPath(prompt.outputPath)));
  const promptsToRun = options.limit ? missingPrompts.slice(0, options.limit) : missingPrompts;
  const results: RunResult[] = [];

  console.log(
    `OpenAI image run: ${promptsToRun.length} queued, ${prompts.length - missingPrompts.length} already present, model=${options.model}, size=${options.size}, quality=${options.quality}`
  );

  for (const [index, entry] of promptsToRun.entries()) {
    const prefix = `[${index + 1}/${promptsToRun.length}] ${entry.title}`;
    try {
      console.log(`${prefix}: generating ${entry.outputPath}`);
      const { image, usage } = await generateImage(entry, options, apiKey);
      if (image.length === 0) {
        throw new Error("Generated image buffer was empty");
      }
      writeImageAtomically(entry.outputPath, image);
      results.push({
        assetId: entry.assetId,
        title: entry.title,
        outputPath: entry.outputPath,
        status: "generated",
        bytes: image.length,
        usage
      });
      console.log(`${prefix}: wrote ${image.length} bytes`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({
        assetId: entry.assetId,
        title: entry.title,
        outputPath: entry.outputPath,
        status: "failed",
        message
      });
      console.error(`${prefix}: failed: ${message}`);
    }

    writeReport(options.reportPath, {
      generatedAt: new Date().toISOString(),
      model: options.model,
      outputFormat: options.outputFormat,
      quality: options.quality,
      size: options.size,
      totalPrompts: prompts.length,
      queued: promptsToRun.length,
      generated: results.filter((result) => result.status === "generated").length,
      failed: results.filter((result) => result.status === "failed").length,
      results
    });

    if (index < promptsToRun.length - 1 && options.delayMs > 0) {
      await sleep(options.delayMs);
    }
  }

  const failed = results.filter((result) => result.status === "failed").length;
  console.log(`OpenAI image run complete: ${results.length - failed} generated, ${failed} failed.`);
  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
