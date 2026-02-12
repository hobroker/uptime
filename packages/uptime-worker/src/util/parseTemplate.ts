import { Liquid } from "liquidjs";

const engine = new Liquid({
  strictFilters: true,
  cache: true,
});

export const parseTemplate = <T extends object | undefined = undefined>(
  templateSource: string,
) => {
  const parsedTemplate = engine.parse(templateSource);

  return (ctx?: T) => engine.renderSync(parsedTemplate, ctx).trim();
};
