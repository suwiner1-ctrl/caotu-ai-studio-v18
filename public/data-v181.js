export const IMG={
hero:"https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=2400&q=90",
mountain:"https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=2000&q=90",
portrait:"https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=1600&q=90",
future:"https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=2000&q=90",
house:"https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=2000&q=90",
cat:"https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=1600&q=90",
cyber:"https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=2000&q=90",
video:"https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=2400&q=90",
agent:"https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=1800&q=90",
auth:"https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=2400&q=90"
};
export const nav=[["/","⌂","首页"],["/image","▧","生图"],["/video","▶","视频"],["/workflow","⌘","工作流"],["/agent","✦","Agent"],["/inspiration","✧","灵感"],["/models","▱","模型"],["/assets","▤","素材"],["/history","◷","作品记录"]];
export const inspirationItems=[["自然之美",IMG.mountain],["东方美学",IMG.portrait],["未来想象",IMG.future],["建筑空间",IMG.house],["治愈日常",IMG.cat],["城市夜景",IMG.cyber]];
export const agents=[["文案写作助手",IMG.portrait],["AI 绘图设计师",IMG.cat],["视频创作专家",IMG.mountain],["学术研究助手",IMG.agent]];
export const modelPics=[IMG.mountain,IMG.cyber,IMG.portrait,IMG.house];
export const esc=(v="")=>String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
