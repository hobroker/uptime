import { Liquid } from "liquidjs";

const engine = new Liquid();

export const parseTemplate = <T extends object | undefined = undefined>(
  templateSource: string,
) => {
  const parsedTemplate = engine.parse(templateSource);

  return (ctx?: T) => engine.renderSync(parsedTemplate, ctx).trim();
};
