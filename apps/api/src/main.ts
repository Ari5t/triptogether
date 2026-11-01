import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import cookieParser from "cookie-parser";
import { AppModule } from "./app.module.js";
import { ENV, type Env } from "./common/env.js";
import { ErrorFilter } from "./common/errors.js";

const app = await NestFactory.create(AppModule);
const env = app.get<Env>(ENV);
app.setGlobalPrefix("api/v1");
app.use(cookieParser());
app.enableCors({ origin: env.WEB_ORIGIN, credentials: true });
app.useGlobalFilters(new ErrorFilter());
await app.listen(env.API_PORT);
