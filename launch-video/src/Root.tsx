import React from "react";
import { Composition } from "remotion";
import cfg from "./config.json";
import { Main } from "./Main";
import { DESK, MOB } from "./layout";

export const Root: React.FC = () => (
  <>
    <Composition id="Dhun16x9" component={Main} durationInFrames={cfg.duration} fps={cfg.fps} width={1920} height={1080} defaultProps={{ L: DESK, withAudio: true }} />
    <Composition id="Dhun9x16" component={Main} durationInFrames={cfg.duration} fps={cfg.fps} width={1080} height={1920} defaultProps={{ L: MOB, withAudio: true }} />
  </>
);
