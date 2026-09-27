
const { CooldownManager } = require('../src/combat/cooldown.js');
const { Hero } = require('../src/entities/hero.js');

describe('MOBA技能冷却', () => {
  test('沉默应暂停冷却而非清零', () => {
    const cd = new CooldownManager();
    cd.addSkill('q', 10);
    cd.startCooldown('q');
    cd.update(3);
    expect(cd.isReady('q')).toBe(false);
    cd.applySilence(2);
    cd.update(2);
    expect(cd.isReady('q')).toBe(false);
  });
  test('沉默结束应从剩余时间继续', () => {
    const cd = new CooldownManager();
    cd.addSkill('q', 10);
    cd.startCooldown('q');
    cd.update(3);
    cd.applySilence(2);
    cd.update(2);
    cd.endSilence();
    cd.update(4);
    expect(cd.isReady('q')).toBe(false);
    cd.update(2);
    expect(cd.isReady('q')).toBe(true);
  });
  test('冷却为0的技能不受沉默影响', () => {
    const cd = new CooldownManager();
    cd.addSkill('passive', 0);
    cd.applySilence(5);
    expect(cd.isReady('passive')).toBe(true);
  });
  test('眩晕应暂停冷却', () => {
    const hero = new Hero();
    hero.cd.addSkill('q', 10);
    hero.castSkill('q');
    hero.ctrl.add('stun', 3);
    hero.update(3);
    expect(hero.cd.isReady('q')).toBe(false);
  });
  test('真实时间计时', () => {
    const cd = new CooldownManager();
    cd.addSkill('q', 1.5);
    cd.startCooldown('q');
    cd.update(0.5);
    expect(cd.skills.q.remaining).toBeCloseTo(1.0, 1);
  });
});
