export type OrganisationAttrs = Record<string, string | null>;

export class Organisation {
  constructor(
    readonly id: string,
    readonly label: string,
    readonly type: string,
    readonly attrs: OrganisationAttrs,
  ) {}
}
