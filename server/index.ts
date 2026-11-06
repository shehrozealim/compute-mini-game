import { createGameServer } from "./game-server.js";
const game = createGameServer();
const port = Number(process.env.BACKEND_PORT) || 3001;
game.http.listen(port, "0.0.0.0", () =>
  console.log("Arena backend ready :" + port),
);
process.on("SIGTERM", () => {
  void game.close();
});
