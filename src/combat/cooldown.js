
const { EventEmitter } = require('events');

class CooldownManager extends EventEmitter {
  constructor() {
    super();
    this.skills = {};
    this.paused = false;
  }
  addSkill(name, cd, options = {}) {
    this.skills[name] = {
      cd,
      remaining: 0,
      paused: false,
      cleanse: !!options.cleanse,
      readyEmitted: true,
    };
  }
  isReady(name) {
    return this.skills[name].remaining <= 0;
  }
  startCooldown(name) {
    const s = this.skills[name];
    s.remaining = s.cd;
    s.readyEmitted = false;
  }
  // dt 为真实时间（秒），绝不使用帧计数；被暂停的技能 remaining 冻结
  update(dt) {
    for (const [name, s] of Object.entries(this.skills)) {
      if (s.paused) continue;
      if (s.remaining > 0) {
        s.remaining = Math.max(0, s.remaining - dt);
        if (s.remaining === 0 && !s.readyEmitted) {
          s.readyEmitted = true;
          this.emit('ready', name);
        }
      }
    }
  }
  // 暂停冷却：只冻结剩余时间，不清零。重复暂停幂等，不重复冻结
  pause() {
    this.paused = true;
    for (const s of Object.values(this.skills)) {
      if (s.cd <= 0 || s.remaining <= 0) continue;
      if (!s.cleanse) s.paused = true;
    }
  }
  // 恢复冷却：从暂停时的剩余时间继续，不重置为完整冷却。重复恢复幂等
  resume() {
    this.paused = false;
    for (const s of Object.values(this.skills)) s.paused = false;
  }
  applySilence() {
    this.pause();
  }
  endSilence() {
    this.resume();
  }
  // 前摇被打断时返还部分冷却：剩余时间落在 (0, 完整冷却) 之间
  refundInterrupted(name, ratio = 0.5) {
    const s = this.skills[name];
    if (!s || s.cd <= 0 || s.remaining <= 0) return;
    s.remaining = Math.max(0, Math.min(s.cd, s.cd * ratio));
  }
  // 技能升级：正在冷却时按新旧冷却等比缩放剩余时间，不重置
  upgrade(name, newCd) {
    const s = this.skills[name];
    if (!s || newCd < 0) return;
    if (s.cd > 0 && s.remaining > 0) {
      s.remaining = Math.min(newCd, (s.remaining / s.cd) * newCd);
    }
    s.cd = newCd;
  }
}

module.exports = { CooldownManager };
