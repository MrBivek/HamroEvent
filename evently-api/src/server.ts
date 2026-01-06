import { createApp } from "./app.js";
import { connectDb } from "./configurations/db.js";
import { env } from "./configurations/env.js";

async function bootstrap() {
  await connectDb();

  const app = createApp();
  app.listen(env.PORT, () => {
    console.log(`API Running on http://localhost:${env.PORT}`);
    console.log(`API Documentation on http://localhost:${env.PORT}/swagger`);
  });
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
