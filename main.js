let canvas = document.getElementById("c");
let ctx = canvas.getContext("2d");
let CANVAS_WIDTH = window.innerWidth-20;
let CANVAS_HEIGHT = window.innerHeight-20;
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

let DEBUG = false;

window.addEventListener("contextmenu", e => e.preventDefault());




class Dot {
  constructor(x, y, vx, vy, color) {
    this.pos = new Vector(x, y);
    this.oldpos = new Vector(x + (vx||0), y + (vy||0)); // velocity x, y
    this.nextpos = new Vector(x, y);

    this.friction = 0.97;
    this.groundFriction = 0.2;

    this.gravity = new Vector(0, 1);

    this.radius = 5;
    this.color = color || "#000";
    this.mass = 1;
  }


  update() {
    if (this.pinned) return;

    let vel = Vector.sub(this.pos, this.oldpos);
    vel.mult(this.friction);

    // if the point touches the ground set groundFriction
    if (this.pos.y >= CANVAS_HEIGHT - this.radius && vel.magSq() > 0.000001) {
      var m = vel.mag();
      vel.x /= m;
      vel.y /= m;
      vel.mult(m * this.groundFriction);
    }
    
    this.oldpos.setXY(this.pos.x, this.pos.y);
    this.pos.add(vel);
    this.pos.add(this.gravity);
  }

  constrain() {
    if (this.pos.x > CANVAS_WIDTH - this.radius) {
      this.pos.x = CANVAS_WIDTH - this.radius;
    }
    if (this.pos.x < this.radius) {
      this.pos.x = this.radius;
    }
    if (this.pos.y > CANVAS_HEIGHT - this.radius - 10) {
      //this.pinned = true;
      this.pos.y = CANVAS_HEIGHT - this.radius - 10;
    }
    if (this.pos.y < this.radius) {
      this.pos.y = this.radius;
    }
  };
  
  render(ctx) {
    ctx.beginPath();
    ctx.fillStyle = this.pinned ? '#ccc' : this.color;
    ctx.arc(this.pos.x, this.pos.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.closePath();
  }
}
 
class Stick {
  constructor(p1, p2, length) {
    this.startPoint = p1;
    this.endPoint = p2;
    this.stiffness = 2;
    this.color = '#000';
    // if the length is not given then calculate the distance based on position
    if (!length) {
      this.length = this.startPoint.pos.dist(this.endPoint.pos);
    } else {
      this.length = length;
    }

  }
  
  update() {
    // calculate the distance between two dots
    let dx = this.endPoint.pos.x - this.startPoint.pos.x;
    let dy = this.endPoint.pos.y - this.startPoint.pos.y;
    // pythagoras theorem
    let dist = Math.sqrt(dx * dx + dy * dy);
    // calculate the resting distance betwen the dots
    let diff = (this.length - dist) / dist * this.stiffness;

    // getting the offset of the dots
    let offsetx = dx * diff * 0.5;
    let offsety = dy * diff * 0.5;

    // calculate mass
    let m1 = this.startPoint.mass + this.endPoint.mass;
    let m2 = this.startPoint.mass / m1;
    m1 = this.endPoint.mass / m1;

    if (this.endPoint.pinned) m1 = 1;
    if (this.startPoint.pinned) m2 = 1;

    // and finally apply the offset with calculated mass
    if (!this.startPoint.pinned) {
      this.startPoint.pos.x -= offsetx * m1;
      this.startPoint.pos.y -= offsety * m1;
    }

    if (!this.endPoint.pinned) {
      this.endPoint.pos.x += offsetx * m2;
      this.endPoint.pos.y += offsety * m2;
    }
  }
  
  render(ctx) {
    ctx.beginPath();
    ctx.strokeStyle = this.color;
    ctx.moveTo(this.startPoint.pos.x, this.startPoint.pos.y);
    ctx.lineTo(this.endPoint.pos.x, this.endPoint.pos.y);
    ctx.stroke();
    ctx.closePath();
  }
}

let mod = (a, n) => a - Math.floor(a/n) * n;
var ang = 0;
class Pivot {
  constructor(p1, p2, p3, angle, deadzone) {
    this.startPoint = p1;
    this.middlePoint = p2;
    this.endPoint = p3;

    this.stiffness = 1;

    this.deadzone = deadzone ?? 0;

    this.color = '#000';

    if (!angle) {
      let v1 = Vector.sub(this.middlePoint.pos, this.startPoint.pos);
      let v2 = Vector.sub(this.middlePoint.pos, this.endPoint.pos);

      let ha = v1.heading();
      let hb = v2.heading();
      let act_diff = hb - ha;
      let act_angle = act_diff < 0 ? (2 * Math.PI)+act_diff : act_diff;
      this.angle = act_angle;
      

//      console.log(this.startPoint.pos, this.middlePoint.pos, this.endPoint.pos)

      //console.log(v1.heading(), v2.heading(), this.angle);
      console.log(v1.headingAbs(), v2.headingAbs(), this.angle / Math.PI * 180);
    } else {
      this.angle = angle;
    }
  }

  update() {
    let v1 = Vector.sub(this.middlePoint.pos, this.startPoint.pos);
    let v2 = Vector.sub(this.middlePoint.pos, this.endPoint.pos);

    let ha = v1.heading();
    let hb = v2.heading();
    let act_diff = hb - ha;
    let act_angle = act_diff < 0 ? (2 * Math.PI)+act_diff : act_diff;

    let diff_angle = (act_angle - this.angle);// * this.stiffness;
    if (Math.abs(diff_angle) < this.deadzone) diff_angle = 0;
    diff_angle = diff_angle / act_angle * this.stiffness;

    if (DEBUG) {
      console.log('-')
      console.log(v1, v2);
      console.log(act_angle / Math.PI * 180, this.angle / Math.PI * 180, diff_angle / Math.PI * 180)
    }

    // calculate mass
    let m1 = v1.magSq() + v2.magSq();
    let m2 = v1.magSq() / m1;
    m1 = v2.magSq() / m1;

    if (this.endPoint.pinned) m1 = 1;
    if (this.startPoint.pinned) m2 = 1;

    if (!this.startPoint.pinned) {
      v1.rotate(diff_angle * m1);
      if (DEBUG)
        console.log(v1);

      this.startPoint.pos.x = this.middlePoint.pos.x - v1.x;
      this.startPoint.pos.y = this.middlePoint.pos.y - v1.y;
    }

    if (!this.endPoint.pinned) {
      v2.rotate(-diff_angle * m2);
      this.endPoint.pos.x = this.middlePoint.pos.x - v2.x;
      this.endPoint.pos.y = this.middlePoint.pos.y - v2.y;
    }

/*
    if (m1 > m2) {
      if (!this.startPoint.pinned) {
        v1.rotate(-diff_angle * 0.5);
        this.startPoint.pos = Vector.sub(this.middlePoint.pos, v1);
      }
    } else {
      if (!this.endPoint.pinned) {
        v2.rotate(diff_angle * 0.5);
        this.endPoint.pos = Vector.sub(this.middlePoint.pos, v2);
      }
    }
*/
  }

  render(ctx) {
     ctx.beginPath();
    ctx.strokeStyle = this.color;

    let a1 = Vector.sub(this.middlePoint.pos, this.startPoint.pos).headingAbs();
    let a2 = Vector.sub(this.middlePoint.pos, this.endPoint.pos).headingAbs();    
    
    ctx.arc(this.middlePoint.pos.x, this.middlePoint.pos.y, 10, a1 + Math.PI, a2 + Math.PI);
    ctx.stroke();
    ctx.closePath();
  }
}


class Entity {
  constructor(iterations) {
    this.dots = [];
    this.sticks = [];
    this.pivots = [];
    this.iterations = iterations || 16;
  }

  pinPoint(p1) {
    this.dots[p1].pinned = true;
  }

  unpinPoint(p1) {
    this.dots[p1].pinned = false;
  }

  addDot(x, y, vx, vy, color) {
    this.dots.push(new Dot(x, y, vx, vy, color));
  }

  addStick(p1, p2, length) {
    this.sticks.push(new Stick(this.dots[p1], this.dots[p2], length));
  }

  addPivot(p1, p2, p3, angle, deadzone) {
    this.pivots.push(new Pivot(this.dots[p1], this.dots[p2], this.dots[p3], angle, deadzone));
  }

  updatePoints() {
    let l = this.dots.length;
    let r = [...Array(l).keys()];/*
    for (var i = 0; i < l; i++) {
      let f = Math.floor(Math.random() * l);
      let t = Math.floor(Math.random() * l);
      let o = r[t];
      r[t] = r[f];
      r[f] = o;
    }*/
    for (let i of r) {
      this.dots[i].update();
    }
  }

  updateSticks() {
    let l = this.sticks.length;
    let r = [...Array(l).keys()];
    if (!DEBUG) {
      for (var i = 0; i < l; i++) {
        let f = Math.floor(Math.random() * l);
        let t = Math.floor(Math.random() * l);
        let o = r[t];
        r[t] = r[f];
        r[f] = o;
      }
    }
    for (let i of r) {
      this.sticks[i].update();
    }
  }

  updatePivots() {
    let l = this.pivots.length;
    let r = [...Array(l).keys()];
    if (!DEBUG) {
      for (var i = 0; i < l; i++) {
        let f = Math.floor(Math.random() * l);
        let t = Math.floor(Math.random() * l);
        let o = r[t];
        r[t] = r[f];
        r[f] = o;
      }
    }
    for (let i of r) {
      this.pivots[i].update();
    }
  }

  updateContrains() {
    for (let i = 0; i < this.dots.length; i++) {
      this.dots[i].constrain();
    }
  }

  renderPoints(ctx) {
    for (let i = 0; i < this.dots.length; i++) {
      this.dots[i].render(ctx);
    }
  }
  renderSticks(ctx) {
    for (let i = 0; i < this.sticks.length; i++) {
      this.sticks[i].render(ctx);
    }
  }
  renderPivots(ctx) {
    for (let i = 0; i < this.pivots.length; i++) {
      this.pivots[i].render(ctx);
    }
  }

  update(ctx) {
    this.updatePoints();

    for (let i = 0; i < this.dots.length; i++) {
      let p1 = this.dots[i];
      for (let j = 0; j < this.dots.length; j++) {
        let p2 = this.dots[j];
        if (p1 != p2) {
          //p1.
        }
      }
    }

    for (let j = 0; j < this.iterations; j++) {
      this.updateSticks();
      this.updateContrains();
    }
    this.updatePivots();

    this.pivotCnt = 0;
    this.render(ctx);
  }

  render(ctx) {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    this.renderPoints(ctx);
    this.renderSticks(ctx);
    this.renderPivots(ctx);
  }

  debugPivot() {
    let idx = this.pivotCnt % this.pivots.length;
    console.log(`Pivot: ${idx} / ${this.pivots.length}`);
    this.pivots[idx].update();
    this.pivotCnt++;
    this.render(ctx);
  }
}

let box = new Entity(DEBUG ? 1 : 100);
/*
box.addDot(300, 300, Math.random() * 80, 0, '#000');
box.addDot(400, 300, 0, 0, '#00f');
box.addDot(400, 400, 0, 0, '#0f0');
box.addDot(300, 400, 0, 0, '#f00');

box.addStick(0, 1);
box.addStick(1, 2);
box.addStick(2, 3);
box.addStick(3, 0);

box.addPivot(0, 1, 2, null, 0);
//box.addPivot(1, 2, 3);
box.addPivot(2, 3, 0, null, 0);
//box.addPivot(3, 0, 1);
*/

let ox = 500, oy = 750;

box.addDot(ox + -200, oy - 0);
box.addDot(ox + -200, oy - 125);
box.addDot(ox + 150, oy - 125);
box.addDot(ox + 150, oy - 75);
box.addDot(ox + 50, oy - 75);
box.addDot(ox + 50, oy - 0);

box.pinPoint(0);

box.addStick(0, 1);
box.addStick(1, 2);
box.addStick(2, 3);
box.addStick(3, 4);
box.addStick(4, 5);
box.addStick(5, 0);

box.addPivot(0, 1, 2);
box.addPivot(1, 2, 3);
box.addPivot(2, 3, 4);
box.addPivot(3, 4, 5);
box.addPivot(4, 5, 0);
box.addPivot(5, 0, 1);

/*
let sides = 20;
let diameter = 100;
for (var s = 0; s < sides; s++) {
  let s_step = (2 * Math.PI) / sides;
  let s_angle = s_step * s;

  let px = Math.cos(s_angle) * diameter;
  let py = Math.sin(s_angle) * diameter;

  box.addDot(ox + px, oy - py);
}

//box.dots[0].pos.x += 1;
box.dots[0].color = '#f00';

for (var s = 0; s < sides; s++)
  box.addStick(s, (s + 1) % sides);

for (var s = 0; s < sides; s++)
  box.addPivot(s, (s + 1) % sides, (s + 2) % sides);
*/

function animate() {
  

  box.update(ctx);
    

  requestAnimationFrame(animate);
}
//animate();
box.render(ctx);

/*

let dot_A = new Dot(0, 0, 0, 0, '#f00');
let dot_B = new Dot(500, 500, 0, 0, '#0f0');
let dot_C = new Dot(0, 0, 0, 0, '#00f');

box.dots.push(dot_A);
box.dots.push(dot_B);
box.dots.push(dot_C);

box.addStick(0, 1);
box.addStick(1, 2);

box.addPivot(0, 1, 2);

canvas.addEventListener("mousedown", function (e) {
  e.preventDefault();
  if (e.button == 0) {
    dot_A.pos.x = e.clientX;
    dot_A.pos.y = e.clientY;
  }
  if (e.button == 2) {
    dot_C.pos.x = e.clientX;
    dot_C.pos.y = e.clientY;
  }

  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  box.render(ctx);


  let v1 = Vector.sub(dot_B.pos, dot_A.pos);
  let v2 = Vector.sub(dot_B.pos, dot_C.pos);

  let ha = v1.heading();
  let hb = v2.heading();

  let act_diff = ha - hb;
  act_diff = act_diff < 0 ? (2 * Math.PI)+act_diff : act_diff;
  //act_diff += (act_diff>180) ? -360 : (act_diff<-180) ? 360 : 0
  console.log('a', ha / Math.PI * 180)
  console.log('b', hb / Math.PI * 180)
  console.log(act_diff / Math.PI * 180)


  return false;
}, false);
box.render(ctx);
*/