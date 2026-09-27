class CooldownManager {
  constructor() {
    this.skills = {};
    this.time = 0;
    this.pausedUntil = 0;
    this.pauseSources = new Set();
    this.readyListeners = [];
  }

  addSkill(name, cd, opts = {}) {
    this.skills[name] = {
      cd,
      remaining: 0,
      pausable: opts.pausable !== false,
      windup: opts.windup || 0,
    };
  }

  onReady(listener) { this.readyListeners.push(listener); }

  _emitReady(name) {
    for (const listener of this.readyListeners) listener(name);
  }

  isPaused() {
    return this.pauseSources.size > 0 || this.time < this.pausedUntil;
  }

  update(dt) {
    const frozen = this.isPaused();
    this.time += dt;
    for (const [name, skill] of Object.entries(this.skills)) {
      if (skill.remaining <= 0) continue;
      if (frozen && skill.pausable) continue;
      skill.remaining = Math.max(0, skill.remaining - dt);
      if (skill.remaining === 0) this._emitReady(name);
    }
  }

  isReady(name) { return this.skills[name].remaining <= 0; }

  startCooldown(name) { this.skills[name].remaining = this.skills[name].cd; }

  applySilence(duration) {
    this.pausedUntil = Math.max(this.pausedUntil, this.time + duration);
  }

  endSilence() {
    this.pausedUntil = this.time;
  }

  pause(source = 'default') { this.pauseSources.add(source); }

  resume(source = 'default') { this.pauseSources.delete(source); }

  refundCooldown(name, amount) {
    const skill = this.skills[name];
    if (!skill) return;
    skill.remaining = Math.max(0, skill.remaining - amount);
  }

  upgradeSkill(name, newCd) {
    const skill = this.skills[name];
    if (!skill) return;
    if (skill.remaining > 0 && skill.cd > 0) {
      skill.remaining = skill.remaining * (newCd / skill.cd);
    }
    skill.cd = newCd;
  }
}

module.exports = { CooldownManager };
