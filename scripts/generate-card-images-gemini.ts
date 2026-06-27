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

type RunStatus = "generated" | "skipped" | "failed";

type RunResult = {
  assetId: string;
  title: string;
  outputPath: string;
  status: RunStatus;
  message?: string;
  bytes?: number;
};

type CliOptions = {
  aspectRatio: string;
  delayMs: number;
  force: boolean;
  imageSize: string;
  limit?: number;
  model: string;
  promptFile: string;
  reportPath: string;
};

const DEFAULT_MODEL = "gemini-3.1-flash-image";
const DEFAULT_REPORT_PATH = "generated/gemini-card-image-report.json";
const INTERACTIONS_URL = "https://generativelanguage.googleapis.com/v1beta/interactions";

function readOptions(): CliOptions {
  const options: CliOptions = {
    aspectRatio: process.env.GEMINI_IMAGE_ASPECT_RATIO ?? "3:4",
    delayMs: Number(process.env.GEMINI_IMAGE_DELAY_MS ?? 1500),
    force: false,
    imageSize: process.env.GEMINI_IMAGE_SIZE ?? "1K",
    model: process.env.GEMINI_IMAGE_MODEL ?? DEFAULT_MODEL,
    promptFile: "generated/card-image-prompts.json",
    reportPath: DEFAULT_REPORT_PATH
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

    if (arg === "--aspect-ratio") {
      options.aspectRatio = nextValue;
    } else if (arg === "--delay-ms") {
      options.delayMs = Number(nextValue);
    } else if (arg === "--image-size") {
      options.imageSize = nextValue;
    } else if (arg === "--limit") {
      options.limit = Number(nextValue);
    } else if (arg === "--model") {
      options.model = nextValue;
    } else if (arg === "--prompt-file") {
      options.promptFile = nextValue;
    } else if (arg === "--report") {
      options.reportPath = nextValue;
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
    "Generate one finished PNG illustration for this card art slot.",
    "Do not include readable text, logos, watermarks, UI, borders, or a card frame.",
    "Keep the subject centered with safe margins for a portrait card crop.",
    negativePrompt
  ]
    .filter(Boolean)
    .join("\n");
}

function collectImageData(value: unknown): string | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const directCandidates = [record.output_image, record.outputImage, record.generatedImage, record.image];
  for (const candidate of directCandidates) {
    if (candidate && typeof candidate === "object") {
      const data = (candidate as Record<string, unknown>).data;
      if (typeof data === "string" && data.length > 0) {
        return data;
      }
    }
  }

  for (const key of ["steps", "content", "parts", "candidates"]) {
    const nested = record[key];
    if (Array.isArray(nested)) {
      for (const item of nested) {
        const data = collectImageData(item);
        if (data) {
          return data;
        }
      }
    }
  }

  if ((record.type === "image" || record.mime_type === "image/png") && typeof record.data === "string") {
    return record.data;
  }

  return undefined;
}

async function generateImage(entry: CardImagePrompt, options: CliOptions, apiKey: string): Promise<Buffer> {
  const response = await fetch(INTERACTIONS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey
    },
    body: JSON.stringify({
      model: options.model,
      input: [{ type: "text", text: buildPrompt(entry) }],
      response_format: {
        type: "image",
        mime_type: "image/png",
        aspect_ratio: options.aspectRatio,
        image_size: options.imageSize
      }
    })
  });

  const responseText = await response.text();
  let responseJson: unknown;
  try {
    responseJson = JSON.parse(responseText);
  } catch {
    responseJson = undefined;
  }

  if (!response.ok) {
    const message =
      responseJson && typeof responseJson === "object" && "error" in responseJson
        ? JSON.stringify((responseJson as Record<string, unknown>).error)
        : responseText.slice(0, 500);
    throw new Error(`Gemini request failed (${response.status}): ${message}`);
  }

  const imageData = collectImageData(responseJson);
  if (!imageData) {
    throw new Error(`Gemini response did not include image data: ${responseText.slice(0, 500)}`);
  }

  return Buffer.from(imageData, "base64");
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
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not set for this process. In the same PowerShell window where you run npm, set `$env:GEMINI_API_KEY=\"...\"` first."
    );
  }

  const options = readOptions();
  const prompts = readPromptCatalog(options.promptFile);
  const missingPrompts = options.force ? prompts : prompts.filter((prompt) => !existsSync(resolvePublicPath(prompt.outputPath)));
  const promptsToRun = options.limit ? missingPrompts.slice(0, options.limit) : missingPrompts;
  const results: RunResult[] = [];

  console.log(`Gemini image run: ${promptsToRun.length} queued, ${prompts.length - missingPrompts.length} already present, model=${options.model}`);

  for (const [index, entry] of promptsToRun.entries()) {
    const prefix = `[${index + 1}/${promptsToRun.length}] ${entry.title}`;
    try {
      console.log(`${prefix}: generating ${entry.outputPath}`);
      const image = await generateImage(entry, options, apiKey);
      if (image.length === 0) {
        throw new Error("Generated image buffer was empty");
      }
      writeImageAtomically(entry.outputPath, image);
      results.push({
        assetId: entry.assetId,
        title: entry.title,
        outputPath: entry.outputPath,
        status: "generated",
        bytes: image.length
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
      aspectRatio: options.aspectRatio,
      imageSize: options.imageSize,
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
  console.log(`Gemini image run complete: ${results.length - failed} generated, ${failed} failed.`);
  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
