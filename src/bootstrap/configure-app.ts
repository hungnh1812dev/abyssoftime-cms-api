import cookieParser from "cookie-parser";

import { INestApplication, ValidationPipe } from "@nestjs/common";

export function configureApp(app: INestApplication): void {
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.use(cookieParser());
}
