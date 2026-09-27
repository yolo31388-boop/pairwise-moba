

class Hero {
  constructor() { this.cd = new CooldownManager(); this.ctrl = new ControlEffect(); }
  castSkill(name) {
    if (this.ctrl.has('silence')) return false;
    if (!this.cd.isReady(name)) return false;
    this.cd.startCooldown(name);
    return true;
  }
  update(dt) {
    this.ctrl.update(dt);
    this.cd.update(dt);
    if (this.ctrl.has('silence')) this.cd.applySilence(dt);
  }
}

module.exports = { Hero };
