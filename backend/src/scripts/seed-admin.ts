import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "../app.module";
import { AdminService } from "../admin/admin.service";

async function main(): Promise<void> {
  const username = process.env.ADMIN_USERNAME?.trim();
  const password = process.env.ADMIN_PASSWORD;

  if (!username || !password) {
    throw new Error(
      "Set ADMIN_USERNAME dan ADMIN_PASSWORD di backend/.env sebelum menjalankan admin:seed.",
    );
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ["error"],
  });

  try {
    const service = app.get(AdminService);
    const result = await service.seedAdmin(username, password);
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await app.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
