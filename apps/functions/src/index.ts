import { Hono } from "hono";
import metadataRegistry from "./handlers/metadata-registry";

const app = new Hono();

// Register metadata registry routes
app.route("/", metadataRegistry);

export default app;
