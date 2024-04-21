import { mapToObj } from 'remeda';

const fontStyles = ['bold', 'dim', 'italic', 'underline', 'inverse', 'hidden', 'strikethrough'] as const;
const fgColors = ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white', 'gray', 'dim'] as const;
const bgColors = ['blackBG', 'redBG', 'greenBG', 'yellowBG', 'blueBG', 'magentaBG', 'cyanBG', 'whiteBG'] as const;

type FontStyle = (typeof fontStyles)[number];
type FgColor = (typeof fgColors)[number];
type BgColor = (typeof bgColors)[number];

type Color =
  | FontStyle
  | FgColor
  | BgColor
  | `${FontStyle} ${FgColor}`
  | `${FontStyle} ${BgColor}`
  | `${FgColor} ${BgColor}`
  | `${FontStyle} ${FgColor} ${BgColor}`;

export function createColorMap<Extra extends string[]>(
  extra?: Extra
): Record<Color | Extra[number], Color | Extra[number]> {
  const combinations: (Color | Extra[number])[] = [];

  combinations.push(...fontStyles);
  combinations.push(...fgColors);
  combinations.push(...bgColors);

  for (const font of fontStyles) {
    for (const fg of fgColors) {
      combinations.push(`${font} ${fg}`);
      for (const bg of bgColors) {
        combinations.push(`${font} ${fg} ${bg}`);
      }
    }
  }

  combinations.push(...(extra ?? []));
  return mapToObj(combinations, (color) => [color, color]);
}
