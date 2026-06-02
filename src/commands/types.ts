export interface NarutoCommand {
  name: string
  description: string
  template: string
  argumentHint?: string
  expand: (args: string) => string
}
