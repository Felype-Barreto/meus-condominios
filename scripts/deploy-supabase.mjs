import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const npx = process.platform === "win32" ? "npx.cmd" : "npx";
let accessToken;

function loadDeployEnv() {
  const envPath = join(process.cwd(), "supabase", ".temp", "deploy.env");

  if (!existsSync(envPath)) {
    return;
  }

  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();

    if (key && value && !process.env[key]) {
      process.env[key] = value;
    }
  }
}

function run(args) {
  console.log(`\n> supabase ${args[0]} ${args[1] ?? ""}`.trim());
  const result = spawnSync(npx, ["supabase", ...args], {
    encoding: "utf8",
    stdio: ["inherit", "pipe", "pipe"],
    shell: process.platform === "win32",
    env: {
      ...process.env,
      ...(accessToken ? { SUPABASE_ACCESS_TOKEN: accessToken } : {}),
    },
  });

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }

  if (result.stderr) {
    process.stderr.write(result.stderr);
  }

  if (result.error) {
    console.error(result.error.message);
  }

  if (result.status !== 0) {
    console.error(`Falhou com status ${result.status ?? "desconhecido"}.`);
    process.exit(result.status ?? 1);
  }
}

async function ask(question) {
  const rl = createInterface({ input, output });
  const answer = await rl.question(question);
  rl.close();
  return answer.trim();
}

console.log("");
console.log("Meus Condomínios Supabase deploy");
console.log("1. Cole um access token da Supabase quando solicitado.");
console.log("2. Cole o project-ref do projeto correto.");
console.log("3. Cole a senha do Postgres do projeto.");
console.log("4. As migrations serão aplicadas automaticamente.");
console.log("");

mkdirSync(join(homedir(), ".supabase"), { recursive: true });
mkdirSync(join(process.cwd(), "supabase", ".temp"), { recursive: true });
loadDeployEnv();

accessToken = process.env.SUPABASE_ACCESS_TOKEN;
accessToken = accessToken || (await ask("Supabase access token: "));

if (!accessToken) {
  console.error("Token vazio. Crie um token em https://supabase.com/dashboard/account/tokens");
  process.exit(1);
}

const projectRef =
  process.env.SUPABASE_PROJECT_REF ||
  (await ask("Project ref: "));

if (!projectRef) {
  console.error("Project ref vazio. Ele aparece na URL do projeto Supabase.");
  process.exit(1);
}

const dbPassword =
  process.env.SUPABASE_DB_PASSWORD ||
  (await ask("Senha do Postgres do projeto: "));

if (!dbPassword) {
  console.error("Senha do banco vazia. Ela é a Database password do projeto Supabase.");
  process.exit(1);
}

run(["link", "--project-ref", projectRef, "--password", dbPassword]);
run(["db", "push", "--linked", "--password", dbPassword, "--include-all"]);
run(["migration", "list", "--linked"]);

console.log("");
console.log("Supabase configurado. Preencha o .env.local com as chaves do projeto.");
