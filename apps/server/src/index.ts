import { createApp } from './app';
import { env, loadedEnvFile } from './infra/env';

const app = createApp();

app.listen(env.PORT, () => {
  console.log(
    `✅ AutoparteAIR API [${env.NODE_ENV}] (${loadedEnvFile}) escuchando en http://localhost:${env.PORT}/api/v1`,
  );
});
