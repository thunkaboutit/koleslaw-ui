<script setup lang="ts">
</script>

<template>
  <div class="border-frame">
    <div class="border-frame__edge border-frame__edge--top" aria-hidden="true"></div>
    <div class="border-frame__edge border-frame__edge--bottom" aria-hidden="true"></div>
    <div class="border-frame__edge border-frame__edge--left" aria-hidden="true"></div>
    <div class="border-frame__edge border-frame__edge--right" aria-hidden="true"></div>
    <div class="border-frame__content">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.border-frame {
  position: relative;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.border-frame__content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  flex: 1;
}

/*
  Cow-spot border — irregular blobs sitting right at the edge, protruding inward.
  Each edge gets its own SVG strip with blobs anchored to y=0 (top of the strip).
  The strip is taller than the visible edge so the blobs poke halfway in.
*/

/* Horizontal edges (top / bottom) — wide strip with blobs along one side */
.border-frame__edge {
  position: fixed;
  z-index: 100;
  pointer-events: none;
}

.border-frame__edge--top,
.border-frame__edge--bottom {
  left: 0;
  right: 0;
  height: 10px;
  overflow: visible;
  /* Blob strip: 800px wide tile, blobs anchored near y=0, hanging downward */
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='80' viewBox='0 0 800 80'%3E%3Cpath d='M20,-30 C35,-55,80,-50,105,-35 C130,-20,140,-45,155,-25 C170,-5,150,25,125,35 C100,45,85,30,60,35 C35,40,15,20,5,0 C-5,-20,5,-5,20,-30Z' fill='%232a2a2a'/%3E%3Cpath d='M280,-20 C300,-50,350,-45,380,-30 C410,-15,420,-40,430,-15 C440,10,425,40,395,45 C365,50,340,35,315,30 C290,25,260,10,280,-20Z' fill='%232a2a2a'/%3E%3Cpath d='M550,-25 C575,-55,625,-48,650,-30 C675,-12,690,-35,695,-10 C700,15,680,40,650,42 C620,44,600,30,580,25 C560,20,525,5,550,-25Z' fill='%232a2a2a'/%3E%3C/svg%3E");
  background-size: 800px 80px;
  background-repeat: repeat-x;
  background-position: center top;
}

.border-frame__edge--top {
  top: 0;
}

.border-frame__edge--bottom {
  bottom: 0;
  transform: scaleY(-1);
}

/* Vertical edges (left / right) — tall strip with blobs along one side */
.border-frame__edge--left,
.border-frame__edge--right {
  top: 0;
  bottom: 0;
  width: 10px;
  overflow: visible;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='800' viewBox='0 0 80 800'%3E%3Cpath d='M-30,20 C-55,35,-50,80,-35,105 C-20,130,-45,140,-25,155 C-5,170,25,150,35,125 C45,100,30,85,35,60 C40,35,20,15,0,5 C-20,-5,-5,5,-30,20Z' fill='%232a2a2a'/%3E%3Cpath d='M-20,280 C-50,300,-45,350,-30,380 C-15,410,-40,420,-15,430 C10,440,40,425,45,395 C50,365,35,340,30,315 C25,290,10,260,-20,280Z' fill='%232a2a2a'/%3E%3Cpath d='M-25,550 C-55,575,-48,625,-30,650 C-12,675,-35,690,-10,695 C15,700,40,680,42,650 C44,620,30,600,25,580 C20,560,5,525,-25,550Z' fill='%232a2a2a'/%3E%3C/svg%3E");
  background-size: 80px 800px;
  background-repeat: repeat-y;
  background-position: left center;
}

.border-frame__edge--left {
  left: 0;
}

.border-frame__edge--right {
  right: 0;
  transform: scaleX(-1);
}
</style>
