(function(){var B=YAHOO.util.Dom,G=YAHOO.lang,W="yui-pb",Y=W+"-mask",V=W+"-bar",E=W+"-caption",S=E+"-container",U=W+"-anim",L=W+"-tl",J=W+"-tr",I=W+"-bl",D=W+"-br",F="width",R="height",K="minValue",T="maxValue",H="value",A="anim",Q="direction",C="ltr",O="rtl",c="ttb",N="btt",X="start",a="progress",P="complete";var M=function(b){M.superclass.constructor.call(this,document.createElement("div"),b);this._init(b);};YAHOO.widget.ProgressBar=M;M.MARKUP=['<div class="',V,'"></div><div class="',S,'"><div class="',E,'"></div></div><div class="',Y,'"><div class="',L,'"></div><div class="',J,'"></div><div class="',I,'"></div><div class="',D,'"></div></div>'].join("");G.extend(M,YAHOO.util.Element,{_init:function(b){},initAttributes:function(e){M.superclass.initAttributes.call(this,e);this.set("innerHTML",M.MARKUP);this.addClass(W);var d,b=["id",F,R,"class","style"];while((d=b.pop())){if(d in e){this.set(d,e[d]);}}this.setAttributeConfig("barEl",{readOnly:true,value:this.getElementsByClassName(V)[0]});this.setAttributeConfig("maskEl",{readOnly:true,value:this.getElementsByClassName(Y)[0]});this.setAttributeConfig("captionEl",{value:this.getElementsByClassName(E)[0],validator:function(f){return(G.isString(f)&&B.get(f))||(G.isObject(f)&&f.ownerDocument==document);},setter:function(f){return B.get(f);}});this.setAttributeConfig(Q,{value:C,validator:function(f){if(this._rendered){return false;}switch(f){case C:case O:case c:case N:return true;default:return false;}},method:function(f){this._barSizeFunction=this._barSizeFunctions[this.get(A)?1:0][f];}});this.setAttributeConfig(T,{value:100,validator:G.isNumber,method:function(f){this.get("element").setAttribute("aria-valuemax",f);if(this.get(H)>f){this.set(H,f);}}});this.setAttributeConfig(K,{value:0,validator:G.isNumber,method:function(f){this.get("element").setAttribute("aria-valuemin",f);if(this.get(H)<f){this.set(H,f);}}});this.setAttributeConfig(F,{getter:function(){return this.getStyle(F);},method:this._widthChange});this.setAttributeConfig(R,{getter:function(){return this.getStyle(R);},method:this._heightChange});this.setAttributeConfig("textTemplate",{value:"{value}"});this.setAttributeConfig(H,{value:0,validator:function(f){return G.isNumber(f)&&f>=this.get(K)&&f<=this.get(T);},method:this._valueChange});this.setAttributeConfig(A,{validator:function(f){return !!YAHOO.util.Anim;},setter:this._animSetter});},render:function(d,e){if(this._rendered){return;}this._rendered=true;var f=this.get(Q);this.addClass(W);this.addClass(W+"-"+f);var b=this.get("element");b.tabIndex=0;b.setAttribute("role","progressbar");b.setAttribute("aria-valuemin",this.get(K));b.setAttribute("aria-valuemax",this.get(T));this.appendTo(d,e);this._barSizeFunction=this._barSizeFunctions[0][f];this.redraw();this._fixEdges();if(this.get(A)){this._barSizeFunction=this._barSizeFunctions[1][f];}this.on("minValueChange",this.redraw);this.on("maxValueChange",this.redraw);return this;},redraw:function(){this._recalculateConstants();this._valueChange(this.get(H));},destroy:function(){this.set(A,false);this.unsubscribeAll();this.get("captionEl").innerHTML="";var b=this.get("element");b.parentNode.removeChild(b);},_previousValue:0,_barSpace:100,_barFactor:1,_rendered:false,_barSizeFunction:null,_heightChange:function(b){if(G.isNumber(b)){b+="px";}this.setStyle(R,b);this._fixEdges();this.redraw();},_widthChange:function(b){if(G.isNumber(b)){b+="px";}this.setStyle(F,b);this._fixEdges();this.redraw();},_fixEdges:function(){if(!this._rendered||YAHOO.env.ua.ie||YAHOO.env.ua.gecko){return;}var f=this.get("maskEl"),h=B.getElementsByClassName(L,undefined,f)[0],e=B.getElementsByClassName(J,undefined,f)[0],g=B.getElementsByClassName(I,undefined,f)[0],d=B.getElementsByClassName(D,undefined,f)[0],b=(parseInt(B.getStyle(f,R),10)-parseInt(B.getStyle(h,R),10))+"px";B.setStyle(g,R,b);B.setStyle(d,R,b);b=(parseInt(B.getStyle(f,F),10)-parseInt(B.getStyle(h,F),10))+"px";B.setStyle(e,F,b);B.setStyle(d,F,b);},_recalculateConstants:function(){var b=this.get("barEl");switch(this.get(Q)){case C:case O:this._barSpace=parseInt(this.get(F),10)-(parseInt(B.getStyle(b,"marginLeft"),10)||0)-(parseInt(B.getStyle(b,"marginRight"),10)||0);break;case c:case N:this._barSpace=parseInt(this.get(R),10)-(parseInt(B.getStyle(b,"marginTop"),10)||0)-(parseInt(B.getStyle(b,"marginBottom"),10)||0);break;}this._barFactor=this._barSpace/(this.get(T)-(this.get(K)||0))||1;},_animSetter:function(e){var d,b=this.get("barEl");if(e){if(e instanceof YAHOO.util.Anim){d=e;}else{d=new YAHOO.util.Anim(b);}d.onTween.subscribe(this._animOnTween,this,true);d.onComplete.subscribe(this._animComplete,this,true);}else{d=this.get(A);if(d){d.onTween.unsubscribeAll();d.onComplete.unsubscribeAll();}d=null;}this._barSizeFunction=this._barSizeFunctions[d?1:0][this.get(Q)];return d;},_animComplete:function(){var b=this.get(H);this._previousValue=b;this.fireEvent(P,b);B.removeClass(this.get("barEl"),U);this._showTemplates(b,true);},_animOnTween:function(){var b=Math.floor(this._tweenFactor*this.get(A).currentFrame+this._previousValue);this.fireEvent(a,b);this._showTemplates(b,false);},_valueChange:function(f){var e=this.get(A),b=Math.floor((f-this.get(K))*this._barFactor),d=this.get("barEl");this._showTemplates(f,true);if(this._rendered){this._barSizeFunction(f,b,d,e);}},_showTemplates:function(f,d){var e=this.get("captionEl"),b=this.get("element"),g=G.substitute(this.get("textTemplate"),{value:f,minValue:this.get(K),maxValue:this.get(T)});if(e){e.innerHTML=g;}if(d){b.setAttribute("aria-valuenow",f);b.setAttribute("aria-valuetext",e.textContent||e.innerText);}}});var Z=[{},{}];M.prototype._barSizeFunctions=Z;Z[0][C]=function(f,b,d,e){this.fireEvent(X,this._previousValue);B.setStyle(d,F,b+"px");this.fireEvent(a,f);this.fireEvent(P,f);};Z[0][O]=function(f,b,d,e){this.fireEvent(X,this._previousValue);B.setStyle(d,F,b+"px");B.setStyle(d,"left",(this._barSpace-b)+"px");this.fireEvent(a,f);this.fireEvent(P,f);};Z[0][c]=function(f,b,d,e){this.fireEvent(X,this._previousValue);
B.setStyle(d,R,b+"px");this.fireEvent(a,f);this.fireEvent(P,f);};Z[0][N]=function(f,b,d,e){this.fireEvent(X,this._previousValue);B.setStyle(d,R,b+"px");B.setStyle(d,"top",(this._barSpace-b)+"px");this.fireEvent(a,f);this.fireEvent(P,f);};Z[1][C]=function(f,b,d,e){if(e.isAnimated()){e.stop();}this.fireEvent(X,this._previousValue);B.addClass(d,U);this._tweenFactor=(f-this._previousValue)/e.totalFrames;e.attributes={width:{to:b}};e.animate();};Z[1][O]=function(f,b,d,e){if(e.isAnimated()){e.stop();}this.fireEvent(X,this._previousValue);B.addClass(d,U);this._tweenFactor=(f-this._previousValue)/e.totalFrames;e.attributes={width:{to:b},left:{to:this._barSpace-b}};e.animate();};Z[1][c]=function(f,b,d,e){if(e.isAnimated()){e.stop();}this.fireEvent(X,this._previousValue);B.addClass(d,U);this._tweenFactor=(f-this._previousValue)/e.totalFrames;e.attributes={height:{to:b}};e.animate();};Z[1][N]=function(f,b,d,e){if(e.isAnimated()){e.stop();}this.fireEvent(X,this._previousValue);B.addClass(d,U);this._tweenFactor=(f-this._previousValue)/e.totalFrames;e.attributes={height:{to:b},top:{to:this._barSpace-b}};e.animate();};})();YAHOO.register("progressbar",YAHOO.widget.ProgressBar,{version:"@VERSION@",build:"@BUILD@"});