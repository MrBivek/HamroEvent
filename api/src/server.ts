import { createServer } from "http";
import { createApp } from "./app.js";
import { connectDb } from "./configurations/db.js";
import { env } from "./configurations/env.js";
import mongoose from "mongoose";
import { runMigrations } from "./migrate.js";
import { initSocket } from "./socket.js";
import { startPaymentReminderJob } from "./common/jobs/paymentReminder.js";

async function bootstrap() {
    await connectDb();
    if (env.MIGRATE_ON_START) {
        console.log("Running migrations...");
        await runMigrations(mongoose.connection, "up");
    }

    const app = createApp();
    const server = createServer(app);
    initSocket(server);
    startPaymentReminderJob();

    server.listen(env.PORT, () => {
        console.log(`API Running on http://localhost:${env.PORT}`);
        console.log(`API Documentation on http://localhost:${env.PORT}/swagger`);
    });
}

bootstrap().catch((err) => {
    console.error(err);
    process.exit(1);
});
