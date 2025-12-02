// /js/rca.js – connect RCA page to fishbone renderer

(function(){
  if (window.__LANDA_RCA_PAGE__) return; window.__LANDA_RCA_PAGE__=true;

  function renderRCAPage(){
    const root=document.getElementById('fbRoot');
    if(!root) return;
    if(window.renderFishbone){
      window.renderFishbone(root,'SetOff');
    }else{
      root.textContent='RCA engine not loaded.';
    }
  }

  window.renderRCAPage = renderRCAPage;
})();
