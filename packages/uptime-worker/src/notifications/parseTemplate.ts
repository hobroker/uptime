import { Liquid } from "liquidjs";

const engine = new Liquid();

export const parseTemplate = <T extends Record<string, unknown>>(
  templateSource: string,
) => {
  const parsedTemplate = engine.parse(templateSource);

  return (ctx: T) => engine.renderSync(parsedTemplate, ctx).trim();
};
