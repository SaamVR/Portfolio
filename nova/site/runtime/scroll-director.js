import { EXPERIENCE_RANGES } from './timeline.js';

const clamp01 = value => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
const lerp = (a,b,t) => a + (b-a) * t;
const RANGE_ORDER = Object.keys(EXPERIENCE_RANGES);

function absoluteTop(element){
  if(!element) return 0;
  const rect=element.getBoundingClientRect();
  return rect.top + (window.scrollY || window.pageYOffset || 0);
}

export function createScrollDirector({
  anchors=[],
  viewportHeight=()=>window.innerHeight
}={}){
  let segments=[];
  let maxScroll=1;

  function refresh(){
    const vh=Math.max(1,Number(viewportHeight())||1);
    const byRange=new Map(
      [...anchors]
        .filter(Boolean)
        .map(element=>[element.dataset.rangeAnchor,element])
    );

    const starts=RANGE_ORDER.map((range,index)=>{
      if(index===0) return 0;
      const element=byRange.get(range);
      return Math.max(0,absoluteTop(element));
    });

    const behind=byRange.get('behind');
    const behindTop=Math.max(0,absoluteTop(behind));
    const behindEnd=Math.max(
      behindTop + vh*.35,
      behindTop + Math.max(vh,behind?.offsetHeight||vh) - vh
    );

    segments=RANGE_ORDER.map((range,index)=>{
      const [progressStart,progressEnd]=EXPERIENCE_RANGES[range];
      const scrollStart=starts[index];
      const nextStart=index<RANGE_ORDER.length-1 ? starts[index+1] : behindEnd;
      const scrollEnd=Math.max(scrollStart+vh*.12,nextStart);
      return {
        range,
        progressStart,
        progressEnd,
        scrollStart,
        scrollEnd
      };
    });

    maxScroll=Math.max(1,segments.at(-1)?.scrollEnd||behindEnd||1);
    return metrics();
  }

  function segmentForScroll(scrollY){
    const y=Math.max(0,Number(scrollY)||0);
    for(let index=0; index<segments.length; index++){
      const segment=segments[index];
      if(y <= segment.scrollEnd || index===segments.length-1) return segment;
    }
    return segments.at(-1);
  }

  function segmentForProgress(progress){
    const p=clamp01(progress);
    for(let index=0; index<segments.length; index++){
      const segment=segments[index];
      if(p <= segment.progressEnd || index===segments.length-1) return segment;
    }
    return segments.at(-1);
  }

  function progressFromScroll(scrollY){
    if(!segments.length) refresh();
    const segment=segmentForScroll(scrollY);
    if(!segment) return 0;
    const local=clamp01(
      ((Number(scrollY)||0)-segment.scrollStart) /
      Math.max(1,segment.scrollEnd-segment.scrollStart)
    );
    return clamp01(lerp(segment.progressStart,segment.progressEnd,local));
  }

  function scrollForProgress(progress){
    if(!segments.length) refresh();
    const p=clamp01(progress);
    const segment=segmentForProgress(p);
    if(!segment) return 0;
    const local=clamp01(
      (p-segment.progressStart) /
      Math.max(.0001,segment.progressEnd-segment.progressStart)
    );
    return lerp(segment.scrollStart,segment.scrollEnd,local);
  }

  function metrics(){
    return {
      maxScroll,
      segments:segments.map(segment=>({...segment}))
    };
  }

  refresh();

  return {
    refresh,
    progressFromScroll,
    scrollForProgress,
    metrics
  };
}
