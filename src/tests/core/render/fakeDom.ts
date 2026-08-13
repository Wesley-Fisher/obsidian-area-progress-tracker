type CreateElOpts = { text?: string; cls?: string };

type StyleLike = { display?: string };

export class FakeElement {
  readonly tagName: string;
  text = "";
  readonly classes = new Set<string>();
  readonly children: FakeElement[] = [];
  readonly style: StyleLike = {};

  constructor(tagName: string, opts?: CreateElOpts) {
    this.tagName = tagName;
    if (opts?.text) this.text = opts.text;
    if (opts?.cls) this.addClass(opts.cls);
  }

  empty(): void {
    this.children.length = 0;
    this.text = "";
  }

  addClass(cls: string): this {
    for (const c of cls.split(/\s+/g).filter(Boolean)) this.classes.add(c);
    return this;
  }

  toggleClass(cls: string, enabled: boolean): this {
    if (enabled) this.classes.add(cls);
    else this.classes.delete(cls);
    return this;
  }

  createDiv(opts?: { cls?: string; text?: string }): FakeElement {
    const el = new FakeElement("div", { cls: opts?.cls, text: opts?.text });
    this.children.push(el);
    return el;
  }

  // Allow any for this testing util
  //eslint-disable-next-line @typescript-eslint/no-explicit-any
  createEl(tag: string, opts?: CreateElOpts): any {
    let el: FakeElement;

    if (tag === "button") el = new FakeButton(opts);
    else if (tag === "input") el = new FakeInput(opts);
    else el = new FakeElement(tag, opts);

    this.children.push(el);

    // Allow any for this testing util
    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    return el as any;
  }

  /** Depth-first collection of all descendants (including self). */
  all(): FakeElement[] {
    const out: FakeElement[] = [this];
    for (const c of this.children) out.push(...c.all());
    return out;
  }

  /** Concatenate text from this node and all descendants. */
  textContent(): string {
    return this.all()
      .map((n) => n.text)
      .filter((t) => t && t.trim().length > 0)
      .join("\n");
  }

  findByText(substr: string): FakeElement | undefined {
    return this.all().find((n) => n.text.includes(substr));
  }

  findAllByTag(tag: string): FakeElement[] {
    return this.all().filter((n) => n.tagName === tag);
  }

  findAllByClass(cls: string): FakeElement[] {
    return this.all().filter((n) => n.classes.has(cls));
  }
}

export class FakeButton extends FakeElement {
  disabled = false;
  onclick: null | (() => void) = null;

  constructor(opts?: CreateElOpts) {
    super("button", opts);
  }

  click(): void {
    if (!this.disabled) this.onclick?.();
  }
}

export class FakeInput extends FakeElement {
  type = "text";
  value = "";
  min = "";
  max = "";
  step = "";
  checked = false;
  disabled = false;
  onchange: null | (() => void) = null;

  constructor(opts?: CreateElOpts) {
    super("input", opts);
  }

  change(nextValue?: string): void {
    if (typeof nextValue === "string") this.value = nextValue;
    if (!this.disabled) this.onchange?.();
  }
}

export function asHTMLElement(el: FakeElement): HTMLElement {
  return el as unknown as HTMLElement;
}
