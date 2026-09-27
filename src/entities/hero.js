

const { CooldownManager } = require('../combat/cooldown.js');
const { ControlEffect, HARD_CONTROL_TYPES } = require('../effects/control.js');

class Hero {
  constructor() {
    this.cd = new CooldownManager();
    this.ctrl = new ControlEffect();
    this.casting = null;
  }
  castSkill(name, castTime = 0) {
    if (this.ctrl.has('silence')) return false;
    if (!this.cd.isReady(name)) return false;
    this.cd.startCooldown(name);
    if (castTime > 0) {
      this.casting = { name, remaining: castTime };
    }
    return true;
  }
  // 公开入口：施加控制效果。硬控立即暂停冷却（净化类技能除外）；
  // 沉默会打断前摇并返还部分冷却
  applyEffect(type, duration) {
    this.ctrl.add(type, duration);
    if (HARD_CONTROL_TYPES.includes(type)) this.cd.pause();
    if (type === 'silence' && this.casting) {
      this.cd.refundInterrupted(this.casting.name);
      this.casting = null;
    }
  }
  update(dt) {
    // 冷却只按真实时间累积：把一帧切成“硬控段/自由段”。
    // 硬控段内非净化技能 remaining 冻结，净化技能照常走表；
    // 控制在帧中结束时，剩余 dt 立即从冻结值继续倒计时，不重置
    let remain = dt;
    while (remain > 0) {
      if (!this.ctrl.isHardControlled()) {
        this.cd.resume();
        this.ctrl.update(remain);
        this.cd.update(remain);
        remain = 0;
        break;
      }
      this.cd.pause();
      const seg = Math.min(remain, this.ctrl.minHardRemaining());
      this.ctrl.update(seg);
      this.cd.update(seg);
      remain -= seg;
    }
    if (this.casting && !this.ctrl.has('silence')) {
      this.casting.remaining -= dt;
      if (this.casting.remaining <= 0) this.casting = null;
    }
  }
}

module.exports = { Hero };
