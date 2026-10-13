const UI = {
  showPage(pageId) {
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
    const page = document.getElementById(pageId);
    if (page) page.classList.add("active");
  },
  setFeedback(text, type = "info") {
    const el = document.getElementById("feedback");
    el.textContent = text;
    el.style.color =
      type === "wrong" ? "#e53e3e" :
      type === "correct" ? "#38a169" :
      "#2b6cb0";
  },
  clearFeedback() {
    document.getElementById("feedback").textContent = "";
  },
  updateStars(stars) {
    document.getElementById("game-stars").textContent = `⭐ ${stars}`;
  },
  updateProgress(current, total) {
    document.getElementById("game-progress").textContent = `第 ${current} / ${total} 题`;
  },
  updateLevel(level) {
    const el = document.getElementById("game-level");
    if (el) el.textContent = `难度：${level}`;
  },
  renderThemes(themes, onSelect) {
    const list = document.getElementById("theme-list");
    list.innerHTML = "";
    themes.forEach(key => {
      const div = document.createElement("div");
      div.className = "theme-item";
      const unlocked = StorageManager.isThemeUnlocked(key);
      if (!unlocked) div.classList.add("locked");
      div.textContent = WORD_DATA[key].name + (unlocked ? "" : " 🔒");
      div.onclick = () => {
        if (!unlocked) {
          UI.showModal("该主题尚未解锁，先在已解锁主题中拿到 8 星以上吧。");
          return;
        }
        onSelect(key);
      };
      list.appendChild(div);
    });
  },
  renderOptions(options, onSelect, optionType = "emoji") {
    const area = document.getElementById("question-area");
    const optionsDiv = document.createElement("div");
    optionsDiv.className = "options";
    options.forEach((opt, index) => {
      const div = document.createElement("div");
      div.className = "option";
      if (optionType === "emoji") {
        div.innerHTML = `<div class="emoji">${opt.emoji || "❓"}</div><div>${opt.zh || ""}</div>`;
      } else if (optionType === "text") {
        div.innerHTML = `<div>${opt.text || opt.en || ""}</div>`;
      } else if (optionType === "word") {
        div.innerHTML = `<div>${opt.en || ""}</div>`;
      }
      div.onclick = () => onSelect(opt, index, div);
      optionsDiv.appendChild(div);
    });
    area.innerHTML = "";
    area.appendChild(optionsDiv);
  },
  showQuestionTitle(title) {
    const area = document.getElementById("question-area");
    const h = document.createElement("div");
    h.className = "question-title";
    h.textContent = title;
    area.prepend(h);
  },
  showModal(text, onOk, onCancel) {
    const modal = document.getElementById("modal");
    const textEl = document.getElementById("modal-text");
    const okBtn = document.getElementById("modal-ok");
    const cancelBtn = document.getElementById("modal-cancel");
    textEl.textContent = text;
    modal.classList.remove("hidden");

    const cleanup = () => {
      modal.classList.add("hidden");
      okBtn.onclick = null;
      cancelBtn.onclick = null;
    };

    okBtn.onclick = () => {
      cleanup();
      if (onOk) onOk();
    };
    cancelBtn.onclick = () => {
      cleanup();
      if (onCancel) onCancel();
    };
  },
  hideModal() {
    document.getElementById("modal").classList.add("hidden");
  },
  showPause() {
    document.getElementById("pause-mask").classList.remove("hidden");
  },
  hidePause() {
    document.getElementById("pause-mask").classList.add("hidden");
  }
};

const Game = {
  ageGroup: "3-5",
  themeKey: "animals",
  questions: [],
  currentIndex: 0,
  stars: 0,
  wrongWords: [],
  totalQuestions: 10,
  answered: false,
  currentQuestion: null,

  level: 1,
  correctStreak: 0,
  wrongStreak: 0,
  paused: false,

  start(ageGroup, themeKey) {
    this.ageGroup = ageGroup;
    this.themeKey = themeKey;
    this.currentIndex = 0;
    this.stars = 0;
    this.wrongWords = [];
    this.answered = false;
    this.level = 1;
    this.correctStreak = 0;
    this.wrongStreak = 0;
    this.paused = false;
    this.questions = this.generateQuestions();
    UI.updateStars(0);
    UI.updateLevel(this.level);
    UI.hidePause();
    UI.showPage("page-game");
    this.renderQuestion();
  },

  updateLevel(isCorrect) {
    if (isCorrect) {
      this.correctStreak++;
      this.wrongStreak = 0;
      if (this.correctStreak >= 2 && this.level < 3) {
        this.level++;
        this.correctStreak = 0;
      }
    } else {
      this.wrongStreak++;
      this.correctStreak = 0;
      if (this.wrongStreak >= 2 && this.level > 1) {
        this.level--;
        this.wrongStreak = 0;
      }
    }
    UI.updateLevel(this.level);
  },

  getQuestionType() {
    if (this.ageGroup === "3-5") return "listen";
    if (this.ageGroup === "6-8") {
      const r = Math.random();
      if (r < 0.4) return "match";
      if (r < 0.7) return "spell";
      return "letters";
    }
    const r = Math.random();
    if (r < 0.6) return "sentence";
    return "order";
  },

  generateQuestions() {
    const words = [...WORD_DATA[this.themeKey].words];
    const list = [];
    const shuffledWords = this.shuffle(words);
    let wordIndex = 0;
    const shuffledSentences = this.shuffle([...SENTENCE_DATA]);
    let sentenceIndex = 0;

    for (let i = 0; i < this.totalQuestions; i++) {
      const type = this.getQuestionType();

      if (type === "sentence") {
        if (sentenceIndex >= shuffledSentences.length) {
          sentenceIndex = 0;
          this.shuffle(shuffledSentences);
        }
        const sentence = shuffledSentences[sentenceIndex++];
        const options = this.buildSentenceOptions(sentence);
        list.push({ type, answer: null, options, sentence });
      } else if (type === "order") {
        if (sentenceIndex >= shuffledSentences.length) {
          sentenceIndex = 0;
          this.shuffle(shuffledSentences);
        }
        const sentence = shuffledSentences[sentenceIndex++];
        list.push({ type, answer: null, options: [], sentence });
      } else {
        if (wordIndex >= shuffledWords.length) {
          wordIndex = 0;
          this.shuffle(shuffledWords);
        }
        const answer = shuffledWords[wordIndex++];
        const options = this.buildOptions(answer, words, type);
        list.push({ type, answer, options, sentence: null });
      }
    }
    return list;
  },

  buildOptions(answer, words, type) {
    let optionCount = 2;
    if (this.ageGroup === "3-5") {
      optionCount = this.level === 1 ? 2 : 3;
    } else {
      optionCount = this.level === 1 ? 3 : 4;
    }
    const options = [answer];
    const others = words.filter(w => w.en !== answer.en);
    while (options.length < optionCount && others.length) {
      const idx = Math.floor(Math.random() * others.length);
      options.push(others.splice(idx, 1)[0]);
    }
    return this.shuffle(options);
  },

  buildSentenceOptions(sentence) {
    const correct = sentence.words.join(" ");
    const wrongs = this.getWrongSentences(sentence, 3);
    const options = [{ text: correct, correct: true }];
    wrongs.forEach(w => {
      if (!options.some(o => o.text === w)) {
        options.push({ text: w, correct: false });
      }
    });
    let guard = 0;
    while (options.length < 4 && guard < 80) {
      guard++;
      const extra = this.getRandomSentence().words.join(" ");
      if (!options.some(o => o.text === extra)) {
        options.push({ text: extra, correct: false });
      }
    }
    return this.shuffle(options);
  },

  getRandomSentence() {
    return SENTENCE_DATA[Math.floor(Math.random() * SENTENCE_DATA.length)];
  },

  getWrongSentences(sentence, count) {
    const correct = sentence.words.join(" ");
    const all = SENTENCE_DATA.filter(s => s.words.join(" ") !== correct);
    const result = [];
    const used = new Set();
    while (result.length < count && all.length) {
      const idx = Math.floor(Math.random() * all.length);
      const text = all.splice(idx, 1)[0].words.join(" ");
      if (!used.has(text)) {
        used.add(text);
        result.push(text);
      }
    }
    return result;
  },

  shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  },

  renderQuestion() {
    AudioManager.stopAll();
    if (this.currentIndex >= this.questions.length) {
      this.finish();
      return;
    }
    this.answered = false;
    UI.clearFeedback();
    document.getElementById("btn-next").classList.add("hidden");
    UI.updateProgress(this.currentIndex + 1, this.totalQuestions);
    UI.updateLevel(this.level);

    const q = this.questions[this.currentIndex];
    this.currentQuestion = q;
    const area = document.getElementById("question-area");
    area.innerHTML = "";

    if (q.type === "listen") {
      UI.showQuestionTitle("听发音，选图片");
      AudioManager.speak(q.answer.en);
      UI.renderOptions(q.options, (opt, idx, el) => this.checkAnswer(opt, idx, el, q), "emoji");
    } else if (q.type === "match") {
      UI.showQuestionTitle("看图片，选单词");
      AudioManager.speak(q.answer.en);
      const title = document.createElement("div");
      title.className = "question-title";
      title.innerHTML = `<div class="emoji" style="font-size:48px">${q.answer.emoji}</div>`;
      area.appendChild(title);
      UI.renderOptions(q.options, (opt, idx, el) => this.checkAnswer(opt, idx, el, q), "word");
    } else if (q.type === "spell") {
      UI.showQuestionTitle("听发音，选首字母");
      AudioManager.speak(q.answer.en);
      const firstLetter = q.answer.en.trim()[0].toUpperCase();
      const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
      const others = alphabet.filter(c => c !== firstLetter);
      const distractors = this.shuffle(others).slice(0, 3);
      const opts = this.shuffle([
        { text: firstLetter, correct: true },
        ...distractors.map(t => ({ text: t, correct: false }))
      ]);
      const hint = document.createElement("div");
      hint.className = "question-title";
      hint.style.fontSize = "16px";
      hint.style.color = "#666";
      hint.textContent = `单词：${q.answer.en}（${q.answer.zh}）`;
      area.appendChild(hint);
      UI.renderOptions(opts, (opt, idx, el) => {
        if (opt.correct) this.handleCorrect(el, q);
        else this.handleWrong(el, q);
      }, "text");
    } else if (q.type === "letters") {
      this.renderLetters(q, area);
    } else if (q.type === "sentence") {
      UI.showQuestionTitle("选择正确的句子");
      AudioManager.playSentence(q.sentence);
      UI.renderOptions(q.options, (opt, idx, el) => {
        if (opt.correct) this.handleCorrect(el, q);
        else this.handleWrong(el, q);
      }, "text");
    } else if (q.type === "order") {
      this.renderOrder(q, area);
    }
  },

  renderLetters(q, area) {
    UI.showQuestionTitle("点击字母，拼出单词");
    AudioManager.speak(q.answer.en);
    const word = q.answer.en.replace(/\s/g, "");
    const letters = word.split("");
    const shuffled = this.shuffle(letters);

    const hint = document.createElement("div");
    hint.className = "question-title";
    hint.style.fontSize = "16px";
    hint.style.color = "#666";
    hint.textContent = `中文：${q.answer.zh}`;
    area.appendChild(hint);

    const result = document.createElement("div");
    result.className = "spell-result";
    area.appendChild(result);

    const blocks = document.createElement("div");
    blocks.className = "spell-area";
    let current = "";

    shuffled.forEach(ch => {
      const b = document.createElement("div");
      b.className = "letter-block";
      b.textContent = ch;
      b.onclick = () => {
        if (this.answered) return;
        if (b.classList.contains("used")) return;
        b.classList.add("used");
        current += ch;
        result.textContent = current;
        if (current.length === word.length) {
          if (current.toLowerCase() === word.toLowerCase()) {
            this.handleCorrect(b, q);
          } else {
            this.handleWrong(b, q);
            setTimeout(() => {
              current = "";
              result.textContent = "";
              blocks.querySelectorAll(".letter-block").forEach(x => x.classList.remove("used"));
            }, 600);
          }
        }
      };
      blocks.appendChild(b);
    });
    area.appendChild(blocks);
  },

  renderOrder(q, area) {
    UI.showQuestionTitle("点击单词，排出正确句子");
    const correct = q.sentence.words.join(" ");
    AudioManager.playSentence(q.sentence);

    const hint = document.createElement("div");
    hint.className = "question-title";
    hint.style.fontSize = "16px";
    hint.style.color = "#666";
    hint.textContent = `中文：${q.sentence.zh}`;
    area.appendChild(hint);

    const result = document.createElement("div");
    result.className = "sentence-result";
    area.appendChild(result);

    const blocks = document.createElement("div");
    blocks.className = "sentence-area";
    const words = this.shuffle(q.sentence.words);
    let current = [];

    words.forEach(w => {
      const b = document.createElement("div");
      b.className = "word-block";
      b.textContent = w;
      b.onclick = () => {
        if (this.answered) return;
        if (b.classList.contains("used")) return;
        b.classList.add("used");
        current.push(w);
        result.textContent = current.join(" ");
        if (current.length === q.sentence.words.length) {
          const userSentence = current.join(" ");
          if (userSentence.toLowerCase() === correct.toLowerCase()) {
            this.handleCorrect(b, q);
          } else {
            this.handleWrong(b, q);
            setTimeout(() => {
              current = [];
              result.textContent = "";
              blocks.querySelectorAll(".word-block").forEach(x => x.classList.remove("used"));
            }, 800);
          }
        }
      };
      blocks.appendChild(b);
    });
    area.appendChild(blocks);
  },

  checkAnswer(opt, idx, el, q) {
    if (this.answered) return;
    const isCorrect = q.type === "listen" || q.type === "match"
      ? opt.en === q.answer.en
      : opt.correct;
    if (isCorrect) this.handleCorrect(el, q);
    else this.handleWrong(el, q);
  },

  handleCorrect(el, q) {
    this.answered = true;
    if (el && el.classList) el.classList.add("correct");
    this.stars += 1;
    UI.updateStars(this.stars);
    UI.setFeedback("答对啦！真棒！", "correct");
    AudioManager.playTone("correct");
    this.updateLevel(true);

    setTimeout(() => {
      if (q.type === "listen" || q.type === "match" || q.type === "letters") {
        AudioManager.speak(q.answer.en);
      } else if (q.type === "sentence" || q.type === "order") {
        AudioManager.playSentence(q.sentence);
      }
    }, 320);

    document.getElementById("btn-next").classList.remove("hidden");
  },

  handleWrong(el, q) {
    if (el && el.classList) el.classList.add("wrong");
    UI.setFeedback("再试一次，或者点“提示”看看答案。", "wrong");
    AudioManager.playTone("wrong");
    this.updateLevel(false);

    let word = "";
    if (q.type === "sentence" || q.type === "order") {
      word = q.sentence.words.join(" ");
    } else if (q.answer) {
      word = q.answer.en;
    }
    if (word && !this.wrongWords.includes(word)) {
      this.wrongWords.push(word);
    }
  },

  showHint() {
    const q = this.currentQuestion;
    if (!q) return;
    if (q.type === "listen" || q.type === "match" || q.type === "letters") {
      UI.setFeedback(`提示：正确答案是 ${q.answer.en}（${q.answer.zh}）`, "info");
      AudioManager.speak(q.answer.en);
    } else if (q.type === "spell") {
      const firstLetter = q.answer.en.trim()[0].toUpperCase();
      UI.setFeedback(`提示：单词 ${q.answer.en} 的首字母是 ${firstLetter}`, "info");
    } else if (q.type === "sentence" || q.type === "order") {
      UI.setFeedback(`提示：正确句子是 ${q.sentence.words.join(" ")}`, "info");
      AudioManager.playSentence(q.sentence);
    }
  },

  next() {
    if (!this.answered) {
      UI.setFeedback("请先答对本题，再进入下一题。", "wrong");
      return;
    }
    AudioManager.stopAll();
    this.currentIndex++;
    if (this.currentIndex >= this.totalQuestions) this.finish();
    else this.renderQuestion();
  },

  finish() {
    AudioManager.stopAll();
    const score = this.stars;
    StorageManager.saveRecord(this.ageGroup, this.themeKey, score, this.totalQuestions, this.wrongWords);
    const record = StorageManager.getRecords()[`${this.ageGroup}_${this.themeKey}`] || {};
    document.getElementById("result-content").innerHTML = `
      <p>年龄组：${this.ageGroup} 岁</p>
      <p>主题：${WORD_DATA[this.themeKey].name}</p>
      <p>得分：${score} / ${this.totalQuestions} ⭐</p>
      <p>最高分：${record.bestScore || score} ⭐</p>
      <p>难度：${this.level}</p>
      <p>错题：${this.wrongWords.length ? this.wrongWords.join("、") : "无"}</p>
    `;
    UI.showPage("page-result");
  },

  reviewWrong() {
    const wrong = StorageManager.getWrongWords();
    if (!wrong.length) {
      UI.showModal("目前没有错题。");
      return;
    }
    UI.showModal("错题复习：" + wrong.join("、"));
  },

  showReport() {
    const data = StorageManager.getReportData();
    const el = document.getElementById("report-content");
    let html = `
      <div class="report-row"><span>总游戏轮数</span><span>${data.totalPlay}</span></div>
      <div class="report-row"><span>历史最高分</span><span>${data.totalBest} ⭐</span></div>
      <div class="report-row"><span>错题总数</span><span>${data.totalWrong}</span></div>
      <div class="report-row"><span>已解锁主题</span><span>${data.unlocked.length}</span></div>
      <h2>各主题表现</h2>
    `;
    Object.keys(data.themeStats).forEach(k => {
      const s = data.themeStats[k];
      html += `
        <div class="report-row">
          <span>${k}</span>
          <span>最高 ${s.bestScore} ⭐ / ${s.playCount} 轮 / 错 ${s.wrongCount}</span>
        </div>
      `;
    });
    el.innerHTML = html;
    UI.showPage("page-report");
  }
};

document.addEventListener("DOMContentLoaded", () => {
  const unlockAudio = () => {
    try {
      const a = new Audio();
      a.muted = true;
      a.play().catch(() => {});
      if (AudioManager.getCtx) AudioManager.getCtx();
    } catch (e) {}
  };
  document.body.addEventListener("touchstart", unlockAudio, { once: true });
  document.body.addEventListener("click", unlockAudio, { once: true });

  const goHome = () => {
    AudioManager.stopAll();
    UI.hidePause();
    UI.showPage("page-home");
    document.getElementById("home-record").textContent = StorageManager.getHomeSummary();
  };

  document.querySelectorAll(".age-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const age = btn.dataset.age;
      AudioManager.speak("ready");
      UI.renderThemes(THEMES, (themeKey) => {
        Game.start(age, themeKey);
      });
      UI.showPage("page-theme");
    });
  });

  document.querySelectorAll("[data-back='home']").forEach(btn => {
    btn.addEventListener("click", goHome);
  });

  const exitBtn = document.getElementById("btn-exit");
  if (exitBtn) {
    exitBtn.addEventListener("click", () => {
      const started = Game.currentIndex > 0 && Game.currentIndex < Game.questions.length;
      if (started) {
        UI.showModal("确定要退出本轮游戏吗？当前进度不会保存。", goHome, () => {});
      } else {
        goHome();
      }
    });
  }

  const pauseBtn = document.getElementById("btn-pause");
  if (pauseBtn) {
    pauseBtn.addEventListener("click", () => {
      Game.paused = true;
      AudioManager.stopAll();
      UI.showPause();
    });
  }

  const resumeBtn = document.getElementById("btn-resume");
  if (resumeBtn) {
    resumeBtn.addEventListener("click", () => {
      Game.paused = false;
      UI.hidePause();
      if (Game.currentQuestion) {
        if (Game.currentQuestion.type === "sentence" || Game.currentQuestion.type === "order") {
          AudioManager.playSentence(Game.currentQuestion.sentence);
        } else if (Game.currentQuestion.answer) {
          AudioManager.speak(Game.currentQuestion.answer.en);
        }
      }
    });
  }

  const replayBtn = document.getElementById("btn-replay");
  if (replayBtn) {
    replayBtn.addEventListener("click", () => {
      const q = Game.currentQuestion;
      if (!q) return;
      AudioManager.stopAll();
      if (q.type === "sentence" || q.type === "order") AudioManager.playSentence(q.sentence);
      else if (q.answer) AudioManager.speak(q.answer.en);
    });
  }

  const hintBtn = document.getElementById("btn-hint");
  if (hintBtn) {
    hintBtn.addEventListener("click", () => Game.showHint());
  }

  const nextBtn = document.getElementById("btn-next");
  if (nextBtn) {
    nextBtn.addEventListener("click", () => Game.next());
  }

  const muteBtn = document.getElementById("btn-mute");
  if (muteBtn) {
    muteBtn.addEventListener("click", (e) => {
      const muted = AudioManager.toggleMute();
      e.target.textContent = muted ? "声音：关" : "声音：开";
    });
  }

  const restartBtn = document.getElementById("btn-restart");
  if (restartBtn) {
    restartBtn.addEventListener("click", () => {
      AudioManager.stopAll();
      Game.start(Game.ageGroup, Game.themeKey);
    });
  }

  const reviewBtn = document.getElementById("btn-review-wrong");
  if (reviewBtn) {
    reviewBtn.addEventListener("click", () => Game.reviewWrong());
  }

  const reportBtn = document.getElementById("btn-report");
  if (reportBtn) {
    reportBtn.addEventListener("click", () => Game.showReport());
  }

  const reportResultBtn = document.getElementById("btn-report-result");
  if (reportResultBtn) {
    reportResultBtn.addEventListener("click", () => Game.showReport());
  }

  const homeRecord = document.getElementById("home-record");
  if (homeRecord) {
    homeRecord.textContent = StorageManager.getHomeSummary();
  }
});