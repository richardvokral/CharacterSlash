import type { InputState } from "./types";

export class InputManager {
  state: InputState = {
    mouse: { x: 0, y: 0 },
    firing: false,
    pauseRequested: false,
    weaponIndex: null,
  };

  private target: HTMLElement;
  private fireQueued = false;

  constructor(target: HTMLElement) {
    this.target = target;
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
  }

  attach(): void {
    this.target.addEventListener("mousemove", this.onMouseMove);
    this.target.addEventListener("mousedown", this.onMouseDown);
    window.addEventListener("mouseup", this.onMouseUp);
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
  }

  detach(): void {
    this.target.removeEventListener("mousemove", this.onMouseMove);
    this.target.removeEventListener("mousedown", this.onMouseDown);
    window.removeEventListener("mouseup", this.onMouseUp);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
  }

  consumeFire(): boolean {
    if (this.fireQueued) {
      this.fireQueued = false;
      return true;
    }
    return false;
  }

  consumePause(): boolean {
    if (this.state.pauseRequested) {
      this.state.pauseRequested = false;
      return true;
    }
    return false;
  }

  consumeWeapon(): number | null {
    const i = this.state.weaponIndex;
    this.state.weaponIndex = null;
    return i;
  }

  private onMouseMove(e: MouseEvent): void {
    const rect = this.target.getBoundingClientRect();
    this.state.mouse.x = e.clientX - rect.left;
    this.state.mouse.y = e.clientY - rect.top;
  }

  private onMouseDown(e: MouseEvent): void {
    if (e.button !== 0) return;
    this.state.firing = true;
    this.fireQueued = true;
  }

  private onMouseUp(): void {
    this.state.firing = false;
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.code === "Space") {
      e.preventDefault();
      this.fireQueued = true;
      this.state.firing = true;
    } else if (e.code === "KeyP" || e.code === "Escape") {
      this.state.pauseRequested = true;
    } else if (e.code === "Digit1") {
      this.state.weaponIndex = 0;
    } else if (e.code === "Digit2") {
      this.state.weaponIndex = 1;
    } else if (e.code === "Digit3") {
      this.state.weaponIndex = 2;
    } else if (e.code === "Digit4") {
      this.state.weaponIndex = 3;
    }
  }

  private onKeyUp(e: KeyboardEvent): void {
    if (e.code === "Space") {
      this.state.firing = false;
    }
  }
}
