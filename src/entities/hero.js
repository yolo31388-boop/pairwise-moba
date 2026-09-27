const { CooldownManager } = require('../combat/cooldown.js');
const { ControlEffect } = require('../effects/control.js');

const HARD_CC = ['silence', 'stun', 'knockup', 'suppress'];
const CAST_INTERRUPT_REFUND_RATIO = 0.5;

class Hero {
  constructor() {
    this.cd = new CooldownManager();
    this.ctrl = new ControlEffect();
    this.casting = null;
  }

  castSkill(name) {
    if (this.ctrl.has('silence')) return false;
    if (!this.cd.isReady(name)) return false;
    this.cd.startCooldown(name);
    const skill = this.cd.skills[name];
    if (skill && skill.windup > 0) {
      this.casting = { name, windup: skill.windup, elapsed: 0 };
    }
    return true;
  }

  applyEffect(type, duration) {
    this.ctrl.add(type, duration);
    if (HARD_CC.includes(type)) this._interruptCast();
  }

  _interruptCast() {
    if (!this.casting) return;
    const { name, windup, elapsed } = this.casting;
    const skill = this.cd.skills[name];
    this.casting = null;
    if (!skill || windup <= 0) return;
    const remainingWindup = Math.max(0, windup - elapsed);
    const refund = skill.cd * CAST_INTERRUPT_REFUND_RATIO * (remainingWindup / windup);
    if (refund > 0) this.cd.refundCooldown(name, refund);
  }

  update(dt) {
    if (this.casting) {
      this.casting.elapsed += dt;
      if (this.casting.elapsed >= this.casting.windup) this.casting = null;
    }
    if (this.ctrl.hasAny(HARD_CC)) this.cd.pause('control');
    else this.cd.resume('control');
    this.ctrl.update(dt);
    this.cd.update(dt);
  }
}

module.exports = { Hero };
