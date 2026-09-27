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
    cd.update(3);
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

describe('冷却引擎不变量', () => {
  test('沉默期间剩余时间完全冻结，不走也不清零', () => {
    const cd = new CooldownManager();
    cd.addSkill('q', 10);
    cd.startCooldown('q');
    cd.update(3);
    cd.applySilence(2);
    cd.update(1);
    expect(cd.skills.q.remaining).toBeCloseTo(7, 5);
    cd.update(1);
    expect(cd.skills.q.remaining).toBeCloseTo(7, 5);
    expect(cd.skills.q.remaining).toBeGreaterThan(0);
  });

  test('沉默不重置为完整冷却', () => {
    const cd = new CooldownManager();
    cd.addSkill('q', 10);
    cd.startCooldown('q');
    cd.update(3);
    cd.applySilence(2);
    cd.update(2);
    cd.endSilence();
    expect(cd.skills.q.remaining).toBeCloseTo(7, 5);
    expect(cd.skills.q.remaining).toBeLessThan(10);
    cd.update(7);
    expect(cd.isReady('q')).toBe(true);
  });

  test('前摇被沉默打断时返还部分冷却', () => {
    const hero = new Hero();
    hero.cd.addSkill('q', 10, { windup: 0.5 });
    expect(hero.castSkill('q')).toBe(true);
    hero.applyEffect('silence', 2);
    const remaining = hero.cd.skills.q.remaining;
    expect(remaining).toBeLessThan(10);
    expect(remaining).toBeGreaterThan(0);
    expect(remaining).toBeCloseTo(5, 5);
  });

  test('眩晕期间剩余时间冻结', () => {
    const hero = new Hero();
    hero.cd.addSkill('q', 10);
    hero.castSkill('q');
    hero.applyEffect('stun', 3);
    hero.update(2);
    expect(hero.cd.skills.q.remaining).toBeCloseTo(10, 5);
    hero.update(2);
    expect(hero.cd.skills.q.remaining).toBeCloseTo(10, 5);
    hero.update(1);
    expect(hero.cd.skills.q.remaining).toBeCloseTo(9, 5);
  });

  test('净化类技能免疫暂停', () => {
    const cd = new CooldownManager();
    cd.addSkill('cleanse', 8, { pausable: false });
    cd.addSkill('q', 8);
    cd.startCooldown('cleanse');
    cd.startCooldown('q');
    cd.applySilence(3);
    cd.update(3);
    expect(cd.skills.cleanse.remaining).toBeCloseTo(5, 5);
    expect(cd.skills.q.remaining).toBeCloseTo(8, 5);
  });

  test('多个控制效果叠加取最长持续时间，不重复暂停或恢复', () => {
    const hero = new Hero();
    hero.cd.addSkill('q', 10);
    hero.castSkill('q');
    hero.applyEffect('silence', 2);
    hero.applyEffect('stun', 5);
    hero.update(3);
    expect(hero.cd.skills.q.remaining).toBeCloseTo(10, 5);
    hero.update(2);
    expect(hero.cd.skills.q.remaining).toBeCloseTo(10, 5);
    hero.update(1);
    expect(hero.cd.skills.q.remaining).toBeCloseTo(9, 5);
  });

  test('技能升级时按新冷却等比缩放剩余时间', () => {
    const cd = new CooldownManager();
    cd.addSkill('q', 10);
    cd.startCooldown('q');
    cd.update(4);
    cd.upgradeSkill('q', 20);
    expect(cd.skills.q.remaining).toBeCloseTo(12, 5);
    expect(cd.isReady('q')).toBe(false);
    cd.update(12);
    expect(cd.isReady('q')).toBe(true);
  });

  test('未在冷却时升级不影响就绪状态', () => {
    const cd = new CooldownManager();
    cd.addSkill('q', 10);
    cd.upgradeSkill('q', 20);
    expect(cd.isReady('q')).toBe(true);
    expect(cd.skills.q.cd).toBe(20);
  });

  test('冷却基于真实时间累积而非帧计数', () => {
    const fine = new CooldownManager();
    fine.addSkill('q', 5);
    fine.startCooldown('q');
    for (let i = 0; i < 10; i++) fine.update(0.1);
    const coarse = new CooldownManager();
    coarse.addSkill('q', 5);
    coarse.startCooldown('q');
    coarse.update(1);
    expect(fine.skills.q.remaining).toBeCloseTo(coarse.skills.q.remaining, 5);
    expect(fine.skills.q.remaining).toBeCloseTo(4, 5);
  });

  test('连续沉默不重复冻结剩余时间', () => {
    const cd = new CooldownManager();
    cd.addSkill('q', 10);
    cd.startCooldown('q');
    cd.update(3);
    cd.applySilence(2);
    cd.update(1);
    cd.applySilence(2);
    cd.update(1.5);
    expect(cd.skills.q.remaining).toBeCloseTo(7, 5);
    cd.endSilence();
    cd.update(7);
    expect(cd.isReady('q')).toBe(true);
  });

  test('冷却结束自动触发就绪事件', () => {
    const cd = new CooldownManager();
    cd.addSkill('q', 2);
    const onReady = jest.fn();
    cd.onReady(onReady);
    cd.startCooldown('q');
    cd.update(1);
    expect(onReady).not.toHaveBeenCalled();
    cd.update(1.5);
    expect(onReady).toHaveBeenCalledTimes(1);
    expect(onReady).toHaveBeenCalledWith('q');
    cd.update(1);
    expect(onReady).toHaveBeenCalledTimes(1);
  });

  test('冷却为0的技能在沉默全程保持就绪且剩余时间为0', () => {
    const cd = new CooldownManager();
    cd.addSkill('passive', 0);
    cd.applySilence(5);
    cd.update(5);
    expect(cd.skills.passive.remaining).toBe(0);
    expect(cd.isReady('passive')).toBe(true);
  });
});
