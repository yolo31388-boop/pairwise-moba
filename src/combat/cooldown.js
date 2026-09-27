
class CooldownManager {
  constructor() { this.skills = {}; this.paused = false; }
  addSkill(name, cd) { this.skills[name] = {cd, remaining: 0, paused: false}; }
  update(dt) {
    // BUG: 沉默时把remaining设为0而不是暂停
    for (const s of Object.values(this.skills)) {
      if (!s.paused) s.remaining = Math.max(0, s.remaining - dt);
    }
  }
  isReady(name) { return this.skills[name].remaining <= 0; }
  startCooldown(name) { this.skills[name].remaining = this.skills[name].cd; }
  applySilence(duration) {
    // BUG: 直接清零而不是暂停
    for (const s of Object.values(this.skills)) s.remaining = 0;
  }
  endSilence() {
    // BUG: 没有恢复剩余时间
  }
}

module.exports = { CooldownManager };
