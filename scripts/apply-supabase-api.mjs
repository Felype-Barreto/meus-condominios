import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

function loadDeployEnv() {
  const envPath = join(process.cwd(), "supabase", ".temp", "deploy.env");

  if (!existsSync(envPath)) {
    throw new Error("Arquivo supabase/.temp/deploy.env não encontrado.");
  }

  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();

    if (key && value) {
      process.env[key] = value;
    }
  }
}

async function runSql(query) {
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${process.env.SUPABASE_PROJECT_REF}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        read_only: false,
      }),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text}`);
  }

  return response.json();
}

loadDeployEnv();

if (!process.env.SUPABASE_ACCESS_TOKEN || !process.env.SUPABASE_PROJECT_REF) {
  throw new Error("SUPABASE_ACCESS_TOKEN e SUPABASE_PROJECT_REF são obrigatórios.");
}

const migrationsDir = join(process.cwd(), "supabase", "migrations");
const files = readdirSync(migrationsDir)
  .filter((file) => file.endsWith(".sql"))
  .sort();

console.log(`Aplicando ${files.length} migrations via Supabase Management API...`);

await runSql("create schema if not exists supabase_migrations;");
await runSql(`
  create table if not exists supabase_migrations.morai_applied_migrations (
    version text primary key,
    name text not null,
    applied_at timestamptz not null default now()
  );
`);

for (const file of files) {
  const version = file.split("_")[0];
  const alreadyApplied = await runSql(`
    select exists (
      select 1
      from supabase_migrations.morai_applied_migrations
      where version = '${version}'
    ) as applied;
  `);

  if (alreadyApplied?.[0]?.applied === true) {
    console.log(`- ${file}: já aplicada`);
    continue;
  }

  console.log(`- ${file}: aplicando`);
  const sql = readFileSync(join(migrationsDir, file), "utf8");

  await runSql(`begin;\n${sql}\ncommit;`);
  await runSql(`
    insert into supabase_migrations.morai_applied_migrations (version, name)
    values ('${version}', '${file.replaceAll("'", "''")}')
    on conflict (version) do nothing;
  `);
}

const tables = await runSql(`
  select table_name
  from information_schema.tables
  where table_schema = 'public'
  order by table_name;
`);

console.log("");
console.log("Migrations aplicadas. Tabelas public encontradas:");
console.log(tables.map((row) => `- ${row.table_name}`).join("\n"));
