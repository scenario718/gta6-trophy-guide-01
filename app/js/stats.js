const GRADE_ORDER = ['platinum', 'gold', 'silver', 'bronze'];

export function completionStats(trophies, earned) {
  const byGrade = {};
  for (const grade of GRADE_ORDER) byGrade[grade] = { earned: 0, total: 0 };
  let done = 0;
  for (const trophy of trophies) {
    const bucket = byGrade[trophy.grade];
    if (!bucket) continue;
    bucket.total += 1;
    if (earned.has(trophy.name)) {
      done += 1;
      bucket.earned += 1;
    }
  }
  const total = trophies.length;
  return {
    earned: done,
    total,
    percent: total === 0 ? 0 : Math.round((done / total) * 100),
    byGrade,
  };
}

export function nextOnRoadmap(roadmap, trophies, earned) {
  const byId = new Map(trophies.map((trophy) => [trophy.id, trophy]));
  for (const stage of roadmap) {
    for (const id of stage.steps) {
      const trophy = byId.get(id);
      if (trophy && !earned.has(trophy.name)) return { stage, trophy };
    }
  }
  return null;
}

export function formatTarget(trophy) {
  if (!trophy.target) return '';
  if (trophy.targetLabel === 'dollars') {
    const amount = Number(trophy.target).toLocaleString('en-US');
    return `PlayStation counter: $${amount}`;
  }
  return `PlayStation counter: ${trophy.target} ${trophy.targetLabel}`;
}

export function gradeWord(grade) {
  if (grade === 'platinum') return 'Platinum';
  if (grade === 'gold') return 'Gold';
  if (grade === 'silver') return 'Silver';
  return 'Bronze';
}
