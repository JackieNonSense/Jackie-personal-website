"use client";

/* Image pixels are the subject of this proof: no automatic resampling/optimization. */
/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import styles from "./HeroProof.module.css";

const root = "/proof/hero-00";
const typeOptions = [
  { id: "artwork", label: "原图字标" },
  { id: "six-caps", label: "Six Caps" },
  { id: "league-gothic", label: "League Gothic" },
] as const;

export default function HeroProof() {
  const [type, setType] = useState<(typeof typeOptions)[number]["id"]>("artwork");
  const [reference, setReference] = useState(false);
  const [paper, setPaper] = useState(true);
  const [lettering, setLettering] = useState(true);
  const [furniture, setFurniture] = useState(true);
  const [overlay, setOverlay] = useState(0);

  return (
    <main className={styles.proof}>
      <h1 className={styles.srOnly}>Yuchao Wang</h1>
      <header className={styles.toolbar}>
        <div className={styles.intro}>
          <p className={styles.eyebrow}>HERO 00 / TYPE PROOF 02</p>
          <p>字形 × 纸张 · 静态校准</p>
        </div>
        <div className={styles.controls} role="group" aria-label="字形方案">
          {typeOptions.map((option) => (
            <button key={option.id} type="button" aria-pressed={type === option.id}
              disabled={reference} onClick={() => setType(option.id)}>{option.label}</button>
          ))}
        </div>
        <button className={styles.compare} type="button" aria-pressed={reference}
          onClick={() => setReference(!reference)}>{reference ? "查看组合" : "查看原图"}</button>
        <fieldset className={styles.layers} disabled={reference}>
          <legend className={styles.srOnly}>独立图层</legend>
          <label><input type="checkbox" checked={paper} onChange={(event) => setPaper(event.target.checked)} />纸张材料</label>
          <label><input type="checkbox" checked={lettering} onChange={(event) => setLettering(event.target.checked)} />姓名图层</label>
          <label><input type="checkbox" checked={furniture} onChange={(event) => setFurniture(event.target.checked)} />小字定位</label>
          <label className={styles.overlayControl}>原图叠加透明度
            <input type="range" min="0" max="100" step="1" value={overlay}
              aria-label="原图叠加透明度" onChange={(event) => setOverlay(Number(event.target.value))} />
            <output>{overlay}%</output>
          </label>
        </fieldset>
      </header>

      <div className={styles.stageWrap}>
        <section className={styles.stage} data-testid="proof-stage" data-type={type}
          data-view={reference ? "reference" : "composition"} aria-label="首屏静态画面">
          {reference ? (
            <img className={styles.plate} src={`${root}/reference-redacted-v02.png`} width="1586" height="992"
              alt="已认可的完整概念图" />
          ) : (
            <>
              {paper && <img className={styles.plate} data-testid="paper-layer" src={`${root}/material-plate-v01.png`}
                width="1586" height="992" alt="" draggable={false} />}
              {lettering && (type === "artwork" ? (
                <img className={`${styles.plate} ${styles.artwork}`} data-testid="artwork-layer"
                  src={`${root}/name-lettering-v01.png`} width="1586" height="992" alt="" draggable={false} />
              ) : (
                <svg className={`${styles.plate} ${styles.native}`} data-testid="native-lettering"
                  viewBox="0 0 1586 992" aria-hidden="true" focusable="false">
                  <text className={styles.topName} x="250" y="366">YUCHAO</text>
                  <text className={styles.bottomName} x="280" y={type === "six-caps" ? 1488 : 1385}>WANG</text>
                </svg>
              ))}
              {furniture && <div className={styles.furniture} aria-hidden="true">
                <span className={styles.mark}>JACKIE</span>
                <span className={styles.index}>00</span>
                <span className={styles.work}>WORK</span>
                <span className={styles.about}>ABOUT</span>
                <span className={styles.contact}>CONTACT</span>
                <span className={styles.status}>SIGNAL DETECTED</span>
                <span className={styles.instruction}>DRAG THE SIGNAL</span>
              </div>}
              {overlay > 0 && <img className={`${styles.plate} ${styles.overlay}`}
                data-testid="reference-overlay" src={`${root}/reference-redacted-v02.png`} width="1586" height="992"
                alt="" style={{ opacity: overlay / 100 }} />}
            </>
          )}
        </section>
      </div>

      <footer className={styles.notes}>
        <p><strong>{reference ? "原图对照" : type === "artwork" ? "A / 独立姓名图形层" : type === "six-caps" ? "B / Six Caps 网页字体" : "C / League Gothic 网页字体"}</strong>
          {reference ? " · 此视图是参考图片，不是实现。" : type === "artwork"
            ? " · 从概念图编辑得到的固定字标，使用黑底滤色合成；不是可自由排字的字体。"
            : " · 以原生字形比较骨架，尚未制作侵蚀和套印材质；没有横向强行压缩。"}</p>
        <p>本轮不是完整首页：绿色信号与蓝色信息层尚未制作，小字仅用于定位，不提供导航或拖动功能。参考叠加为 0% 时，组合中不使用整页概念图。</p>
        <p>此页保留历史静态校准；参考副本已移除生日。新的完整交互预览在 localhost:3011 根首页；monitor 和线上网站未改动。</p>
      </footer>
    </main>
  );
}
