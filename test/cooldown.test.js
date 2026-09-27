
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
  test('沉默期间剩余时间完全冻结（不清零、不走表）', () => {
    const cd = new CooldownManager();
    cd.addSkill('q', 10);
    cd.startCooldown('q');
    cd.update(3);
    cd.applySilence(2);
    expect(cd.skills.q.remaining).toBeCloseTo(7, 10);
    cd.update(2);
    expect(cd.skills.q.remaining).toBeCloseTo(7, 10);
    cd.update(1.5);
    expect(cd.skills.q.remaining).toBeCloseTo(7, 10);
  });
  test('沉默不重置为完整冷却，恢复后从冻结值继续', () => {
    const cd = new CooldownManager();
    cd.addSkill('q', 10);
    cd.startCooldown('q');
    cd.update(6);
    cd.applySilence(3);
    cd.update(3);
    expect(cd.skills.q.remaining).toBeCloseTo(4, 10);
    cd.endSilence();
    cd.update(3);
    expect(cd.skills.q.remaining).toBeCloseTo(1, 10);
    cd.update(1);
    expect(cd.isReady('q')).toBe(true);
  });
  test('重复暂停/恢复幂等，连续沉默不重复冻结或重置', () => {
    const cd = new CooldownManager();
    cd.addSkill('q', 10);
    cd.startCooldown('q');
    cd.update(2);
    cd.applySilence(2);
    cd.applySilence(2);
    cd.endSilence();
    cd.endSilence();
    expect(cd.skills.q.remaining).toBeCloseTo(8, 10);
    cd.update(1);
    expect(cd.skills.q.remaining).toBeCloseTo(7, 10);
  });
  test('前摇被沉默打断时返还部分冷却（不全扣、也不免费）', () => {
    const hero = new Hero();
    hero.cd.addSkill('q', 10);
    expect(hero.castSkill('q', 1)).toBe(true);
    expect(hero.cd.skills.q.remaining).toBeCloseTo(10, 10);
    hero.update(0.4);
    hero.applyEffect('silence', 2);
    expect(hero.cd.skills.q.remaining).toBeGreaterThan(0);
    expect(hero.cd.skills.q.remaining).toBeLessThan(10);
    expect(hero.cd.skills.q.remaining).toBeCloseTo(5, 10);
    expect(hero.casting).toBeNull();
  });
  test('打断返还后沉默期间冻结，结束后从返还值继续', () => {
    const hero = new Hero();
    hero.cd.addSkill('q', 10);
    hero.castSkill('q', 1);
    hero.applyEffect('silence', 2);
    hero.update(2);
    expect(hero.cd.skills.q.remaining).toBeCloseTo(5, 10);
    hero.update(3);
    expect(hero.cd.skills.q.remaining).toBeCloseTo(2, 10);
  });
  test('眩晕在英雄更新循环中暂停冷却并在结束后继续', () => {
    const hero = new Hero();
    hero.cd.addSkill('q', 10);
    hero.castSkill('q');
    hero.applyEffect('stun', 3);
    hero.update(3);
    expect(hero.cd.skills.q.remaining).toBeCloseTo(10, 10);
    hero.update(4);
    expect(hero.cd.skills.q.remaining).toBeCloseTo(6, 10);
  });
  test('击飞同样暂停冷却', () => {
    const hero = new Hero();
    hero.cd.addSkill('q', 8);
    hero.castSkill('q');
    hero.applyEffect('knockup', 2);
    hero.update(2);
    expect(hero.cd.skills.q.remaining).toBeCloseTo(8, 10);
  });
  test('净化类技能在沉默/眩晕期间不被暂停', () => {
    const hero = new Hero();
    hero.cd.addSkill('purify', 10, { cleanse: true });
    hero.cd.startCooldown('purify');
    hero.applyEffect('silence', 3);
    hero.update(3);
    expect(hero.cd.skills.purify.paused).toBe(false);
    expect(hero.cd.skills.purify.remaining).toBeCloseTo(7, 10);
    hero.applyEffect('stun', 2);
    hero.update(2);
    expect(hero.cd.skills.purify.paused).toBe(false);
    expect(hero.cd.skills.purify.remaining).toBeCloseTo(5, 10);
  });
  test('多控制叠加取最长持续时间，只暂停一次、恢复一次', () => {
    const hero = new Hero();
    hero.cd.addSkill('q', 20);
    hero.castSkill('q');
    hero.applyEffect('silence', 2);
    hero.applyEffect('stun', 5);
    hero.update(2);
    expect(hero.ctrl.has('silence')).toBe(false);
    expect(hero.ctrl.has('stun')).toBe(true);
    expect(hero.cd.skills.q.remaining).toBeCloseTo(20, 10);
    hero.update(3);
    expect(hero.cd.skills.q.remaining).toBeCloseTo(20, 10);
    hero.update(4);
    expect(hero.cd.skills.q.remaining).toBeCloseTo(16, 10);
  });
  test('同类连续控制刷新为最长持续时间，不重复暂停/恢复', () => {
    const hero = new Hero();
    hero.cd.addSkill('q', 20);
    hero.castSkill('q');
    hero.applyEffect('silence', 3);
    hero.update(2);
    hero.applyEffect('silence', 4);
    expect(hero.ctrl.effects.filter(e => e.type === 'silence')).toHaveLength(1);
    expect(hero.ctrl.effects[0].remaining).toBeCloseTo(4, 10);
    hero.update(3);
    expect(hero.ctrl.has('silence')).toBe(true);
    expect(hero.cd.skills.q.remaining).toBeCloseTo(20, 10);
    hero.update(2);
    expect(hero.cd.skills.q.remaining).toBeCloseTo(19, 10);
  });
  test('技能升级时正在冷却，剩余时间按新冷却等比缩放', () => {
    const cd = new CooldownManager();
    cd.addSkill('q', 10);
    cd.startCooldown('q');
    cd.update(5);
    cd.upgrade('q', 20);
    expect(cd.skills.q.cd).toBe(20);
    expect(cd.skills.q.remaining).toBeCloseTo(10, 10);
    cd.pause();
    cd.upgrade('q', 40);
    expect(cd.skills.q.remaining).toBeCloseTo(20, 10);
  });
  test('冷却为0的技能暂停期间也保持就绪，且不进入paused', () => {
    const hero = new Hero();
    hero.cd.addSkill('passive', 0);
    hero.applyEffect('silence', 5);
    hero.update(5);
    expect(hero.cd.isReady('passive')).toBe(true);
    expect(hero.cd.skills.passive.paused).toBe(false);
  });
  test('冷却基于真实时间累积：任意小数步长精确递减', () => {
    const cd = new CooldownManager();
    cd.addSkill('q', 1.5);
    cd.startCooldown('q');
    cd.update(0.1);
    cd.update(0.2);
    cd.update(0.25);
    expect(cd.skills.q.remaining).toBeCloseTo(0.95, 10);
    cd.update(0.95);
    expect(cd.isReady('q')).toBe(true);
  });
  test('冷却结束自动触发ready事件，且每个冷却周期只触发一次', () => {
    const cd = new CooldownManager();
    cd.addSkill('q', 3);
    const fired = [];
    cd.on('ready', name => fired.push(name));
    cd.startCooldown('q');
    cd.update(2);
    cd.update(2);
    expect(fired).toEqual(['q']);
    cd.update(1);
    expect(fired).toEqual(['q']);
    cd.startCooldown('q');
    cd.update(3);
    expect(fired).toEqual(['q', 'q']);
  });
  test('沉默中无法施法，沉默结束后冷却继续走且可再次施法', () => {
    const hero = new Hero();
    hero.cd.addSkill('q', 4);
    expect(hero.castSkill('q')).toBe(true);
    hero.applyEffect('silence', 2);
    hero.update(1.5);
    expect(hero.castSkill('q')).toBe(false);
    hero.update(1.5);
    expect(hero.castSkill('q')).toBe(false);
    hero.update(4);
    expect(hero.castSkill('q')).toBe(true);
  });
});
