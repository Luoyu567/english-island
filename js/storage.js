const StorageManager = {
  KEY: "english_island_records",
  UNLOCK_KEY: "english_island_unlocked",

  getRecords() {
    try {
      const raw = localStorage.getItem(this.KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  },

  saveRecord(ageGroup, theme, score, total, wrongWords) {
    const records = this.getRecords();
    const key = `${ageGroup}_${theme}`;
    const old = records[key] || { bestScore: 0, total: 0, wrong: [], playCount: 0 };
    records[key] = {
      bestScore: Math.max(old.bestScore || 0, score),
      total: total,
      wrong: Array.from(new Set([...(old.wrong || []), ...wrongWords])),
      playCount: (old.playCount || 0) + 1,
      lastTime: Date.now()
    };
    localStorage.setItem(this.KEY, JSON.stringify(records));

    // 解锁逻辑：最高分 >= 8 解锁下一个主题
    if (records[key].bestScore >= 8) {
      this.unlockNextTheme(theme);
    }

    return records[key];
  },

  getUnlockedThemes() {
    try {
      const raw = localStorage.getItem(this.UNLOCK_KEY);
      return raw ? JSON.parse(raw) : ["animals"];
    } catch (e) {
      return ["animals"];
    }
  },

  unlockNextTheme(theme) {
    if (typeof THEMES === "undefined") return;
    const unlocked = this.getUnlockedThemes();
    const idx = THEMES.indexOf(theme);
    if (idx >= 0 && idx + 1 < THEMES.length) {
      const next = THEMES[idx + 1];
      if (!unlocked.includes(next)) {
        unlocked.push(next);
        localStorage.setItem(this.UNLOCK_KEY, JSON.stringify(unlocked));
      }
    }
  },

  isThemeUnlocked(theme) {
    return this.getUnlockedThemes().includes(theme);
  },

  getWrongWords() {
    const records = this.getRecords();
    const all = [];
    Object.values(records).forEach(r => {
      if (r.wrong) all.push(...r.wrong);
    });
    return Array.from(new Set(all));
  },

  getHomeSummary() {
    const records = this.getRecords();
    const keys = Object.keys(records);
    if (!keys.length) return "暂无记录";
    let totalPlay = 0;
    let best = 0;
    keys.forEach(k => {
      totalPlay += records[k].playCount || 0;
      best = Math.max(best, records[k].bestScore || 0);
    });
    return `已玩 ${totalPlay} 轮，最高分 ${best} 分`;
  },

  getReportData() {
    const records = this.getRecords();
    const keys = Object.keys(records);
    let totalPlay = 0;
    let totalBest = 0;
    let totalWrong = 0;
    const themeStats = {};
    keys.forEach(k => {
      const r = records[k];
      totalPlay += r.playCount || 0;
      totalBest = Math.max(totalBest, r.bestScore || 0);
      totalWrong += (r.wrong || []).length;
      themeStats[k] = {
        bestScore: r.bestScore || 0,
        playCount: r.playCount || 0,
        wrongCount: (r.wrong || []).length
      };
    });
    return {
      totalPlay,
      totalBest,
      totalWrong,
      themeStats,
      unlocked: this.getUnlockedThemes()
    };
  }
};