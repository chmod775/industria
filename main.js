let canvas = document.getElementById("c");
let ctx = canvas.getContext("2d");
let CANVAS_WIDTH = window.innerWidth-20;
let CANVAS_HEIGHT = window.innerHeight-20;
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

let DEBUG = true;

window.addEventListener("contextmenu", e => e.preventDefault());




class Dot {
  constructor(x, y, vx, vy, color) {
    this.id = 0;

    this.pos = new Vector(x, y);
    this.oldpos = new Vector(x + (vx||0), y + (vy||0)); // velocity x, y
    this.nextpos = new Vector(x, y);

    this.friction = 0.97;
    this.groundFriction = 0.5;

    this.gravity = new Vector(0, 1);

    this.radius = 5;
    this.color = color || "#000";
    this.mass = 1;
  }

  freeze() {
    this.oldpos.setXY(this.pos.x, this.pos.y);
  }

  update() {
    if (this.pinned) return;

    let vel = Vector.sub(this.pos, this.oldpos);
    vel.mult(this.friction);

    // if the point touches the ground set groundFriction
    
    if (this.pos.y >= (CANVAS_HEIGHT - this.radius - 10) && vel.magSq() > 0.000001) {
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
      //this.pos.y -= (this.pos.y - (CANVAS_HEIGHT - this.radius - 10));
      this.pos.y = (CANVAS_HEIGHT - this.radius - 10);
      //this.freeze();
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
    this.id = 0;
    this.startPoint = p1;
    this.endPoint = p2;
    this.stiffness = 2;
    this.color = '#000';
    this.calculate();
  }

  calculate() {
    this.length = this.startPoint.pos.dist(this.endPoint.pos);
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
  constructor(s1, s2, angle, deadzone) {
    this.id = 0;
    
    this.startStick = s1;
    this.endStick = s2;

    console.log(this.startStick, this.endStick);

    if (this.startStick.endPoint == this.endStick.startPoint) {
      this.startPoint = this.startStick.startPoint;
      this.middlePoint = this.endStick.startPoint;
      this.endPoint = this.endStick.endPoint;
    } else if (this.startStick.startPoint == this.endStick.endPoint) {
      this.startPoint = this.startStick.endPoint;
      this.middlePoint = this.startStick.startPoint;
      this.endPoint = this.endStick.startPoint;
    } else if (this.startStick.startPoint == this.endStick.startPoint) {
      this.startPoint = this.startStick.endPoint;
      this.middlePoint = this.endStick.startPoint;
      this.endPoint = this.endStick.endPoint;
    } else if (this.startStick.endPoint == this.endStick.endPoint) {
      this.startPoint = this.startStick.startPoint;
      this.middlePoint = this.endStick.endPoint;
      this.endPoint = this.endStick.startPoint;
    } else {
      
      console.error(this.startStick, this.endStick);
      throw 'Sticks not connected';
    }

    this.stiffness = 0.25;

    this.deadzone = deadzone ?? 0;

    this.color = '#000';

    this.calculate();
  }

  calculate() {
    let v1 = Vector.sub(this.middlePoint.pos, this.startPoint.pos);
    let v2 = Vector.sub(this.middlePoint.pos, this.endPoint.pos);

    let ha = v1.heading();
    let hb = v2.heading();
    let act_diff = hb - ha;
    let act_angle = act_diff < 0 ? (2 * Math.PI)+act_diff : act_diff;
    this.angle = act_angle;

    console.log(v1.headingAbs(), v2.headingAbs(), this.angle / Math.PI * 180);
  }

  update(step) {
    if (this.startPoint.pinned && this.endPoint.pinned) return;

    let dot_S = this.startPoint;
    let dot_M = this.middlePoint;
    let dot_E = this.endPoint;

    let v1 = Vector.sub(dot_M.pos, dot_S.pos);
    let v2 = Vector.sub(dot_M.pos, dot_E.pos);

    let ha = v1.heading();
    let hb = v2.heading();
    let act_diff = hb - ha;
    let act_angle = act_diff < 0 ? (2 * Math.PI)+act_diff : act_diff;

    let diff_angle = (this.angle - act_angle);// * this.stiffness;

    diff_angle = Math.sign(diff_angle) * Math.max(0, Math.abs(diff_angle) - this.deadzone);

    let perc_diff = 1.0;//Math.abs(diff_angle / this.angle) * 2; // 0.5

    if (DEBUG) {
      console.log('-')
      console.log(v1, v2);
      console.log(ha / Math.PI * 180, hb / Math.PI * 180);
      console.log(act_angle / Math.PI * 180, this.angle / Math.PI * 180, diff_angle / Math.PI * 180)
    }

    // calculate mass
    let m1 = v1.magSq() + v2.magSq();
    let m2 = v1.magSq() / m1;
    m1 = v2.magSq() / m1;

    if (dot_S.pinned && dot_E.pinned) return;

    if (dot_M.pinned) {
      v1.rotate(-diff_angle * m1);
      //[OPTIONAL ???] v1.limit(this.startStick.length);
      let t_s = new Vector(dot_M.pos.x - v1.x, dot_M.pos.y - v1.y);
      let diff_s = Vector.sub(dot_S.pos, t_s);
      diff_s.mult(perc_diff);
    
      if (!dot_S.pinned) {
        dot_S.pos.x -= diff_s.x;
        dot_S.pos.y -= diff_s.y;
      }

      v2.rotate(diff_angle * m2);
      //[OPTIONAL ???] v2.limit(this.endStick.length);
      let t_e = new Vector(dot_M.pos.x - v2.x, dot_M.pos.y - v2.y);
      let diff_e = Vector.sub(dot_E.pos, t_e);
      diff_e.mult(perc_diff);
    
      if (!dot_E.pinned) {
        dot_E.pos.x -= diff_e.x;
        dot_E.pos.y -= diff_e.y;
      }
    } else {
      if (step % 2 == 0) {
        v1.rotate(-diff_angle * m1);
        //[OPTIONAL ???] v1.limit(this.startStick.length);
        let t_s = new Vector(dot_S.pos.x + v1.x, dot_S.pos.y + v1.y);
        let diff_s = Vector.sub(dot_M.pos, t_s);
        diff_s.mult(perc_diff);
      
        dot_M.pos.x -= diff_s.x;
        dot_M.pos.y -= diff_s.y;

        v2.rotate(diff_angle * m2);
        //[OPTIONAL ???] v2.limit(this.endStick.length);
        let t_e = new Vector(dot_M.pos.x - v2.x, dot_M.pos.y - v2.y);
        let diff_e = Vector.sub(dot_E.pos, t_e);
        diff_e.mult(perc_diff);
      
        if (!dot_E.pinned) {
          dot_E.pos.x -= diff_e.x;
          dot_E.pos.y -= diff_e.y;
        }
      } else {
        v2.rotate(diff_angle * m2);
        //[OPTIONAL ???] v2.limit(this.endStick.length);
        let t_e = new Vector(dot_E.pos.x + v2.x, dot_E.pos.y + v2.y);
        let diff_e = Vector.sub(dot_M.pos, t_e);
        diff_e.mult(perc_diff);
      
        dot_M.pos.x -= diff_e.x;
        dot_M.pos.y -= diff_e.y;

        v1.rotate(-diff_angle * m1);
        //[OPTIONAL ???] v1.limit(this.startStick.length);
        let t_s = new Vector(dot_M.pos.x - v1.x, dot_M.pos.y - v1.y);
        let diff_s = Vector.sub(dot_S.pos, t_s);
        diff_s.mult(perc_diff);
      
        if (!dot_S.pinned) {
          dot_S.pos.x -= diff_s.x;
          dot_S.pos.y -= diff_s.y;
        }
      }
    }
  }

  update_stick() {
    let dot_S = this.startPoint;
    let dot_M = this.middlePoint;
    let dot_E = this.endPoint;

    let v1 = Vector.sub(dot_M.pos, dot_S.pos);
    let h_v1 = v1.heading();
    let v1_dist = v1.mag();
    let v1_diff = (this.startStick.length - v1_dist) / v1_dist * this.startStick.stiffness;
    let v1_offset = v1.mult(v1_diff * 0.5);

    let v2 = Vector.sub(dot_M.pos, dot_E.pos);
    let h_v2 = v2.heading();
    let v2_dist = v2.mag();
    let v2_diff = (this.endStick.length - v2_dist) / v2_dist * this.endStick.stiffness;
    let v2_offset = v2.mult(v2_diff * 0.5);

    

    let angle_diff = h_v2 - h_v1;
    let act_angle = angle_diff < 0 ? (2 * Math.PI)+angle_diff : angle_diff;

    let diff_angle = (this.angle - act_angle);// * this.stiffness;

    v1_offset.rotate(diff_angle);
    v2_offset.rotate(diff_angle);

    dot_S.pos.x -= v1_offset.x;
    dot_S.pos.y -= v1_offset.y;

    dot_E.pos.x += v2_offset.x;
    dot_E.pos.y += v2_offset.y;
  }

  update_from_worldwideweb() {

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
    this.pivotCnt = 0;
  }

  pinPoint(p1) {
    this.dots[p1].pinned = true;
  }

  unpinPoint(p1) {
    this.dots[p1].pinned = false;
  }

  addDot(x, y, vx, vy, color) {
    let n_dot = new Dot(x, y, vx, vy, color);
    n_dot.id = this.dots.length;
    this.dots.push(n_dot);
  }

  addStick(p1, p2, length) {
    let n_stick = new Stick(this.dots[p1], this.dots[p2], length);
    n_stick.id = this.sticks.length;
    this.sticks.push(n_stick);
  }

  addPivot(s1, s2, deadzone) {
    /*
    // NOOB Style
    let fromPoint = this.sticks[s1].startPoint;
    let toPoint = this.sticks[s2].endPoint;
    this.sticks.push(new Stick(fromPoint, toPoint));
    */
    this.pivots.push(new Pivot(this.sticks[s1], this.sticks[s2], null, deadzone));
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
    let r = [...Array(l).keys()];/*
    if (!DEBUG) {
      for (var i = 0; i < l; i++) {
        let f = Math.floor(Math.random() * l);
        let t = Math.floor(Math.random() * l);
        let o = r[t];
        r[t] = r[f];
        r[f] = o;
      }
    }*/
    for (let i of r) {
      this.sticks[i].update();
    }
  }

  updatePivots(step) {
    let l = this.pivots.length;
    let r = [...Array(l).keys()];/*
    if (!DEBUG || true) {
      for (var i = 0; i < l; i++) {
        let f = Math.floor(Math.random() * l);
        let t = Math.floor(Math.random() * l);
        let o = r[t];
        r[t] = r[f];
        r[f] = o;
      }
    }*/
    for (let i of r) {
      this.pivots[i].update(step);
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

    for (let j = 0; j < this.iterations; j++) {
      this.updateSticks();
      this.updatePivots(j);
      this.updateContrains();
    }

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
    this.pivots[idx].color = '#ff0';
    this.pivots[(idx + this.pivots.length - 1) % this.pivots.length].color = '#000';
    this.pivotCnt++;
    this.render(ctx);
  }

  recalculate() {
    for (let i = 0; i < this.sticks.length; i++) {
      this.sticks[i].calculate();
    }
    for (let i = 0; i < this.pivots.length; i++) {
      this.pivots[i].calculate();
    }
  }
}

let box = new Entity(20);
/*
box.addDot(300, 300, -Math.random() * 80, Math.random() * 80, '#000');
box.addDot(400, 300, 0, 0, '#00f');
box.addDot(400, 400, 0, 0, '#0f0');
box.addDot(300, 400, 0, 0, '#f00');

box.addStick(0, 1);
box.addStick(1, 2);
box.addStick(2, 3);
box.addStick(3, 0);

box.addPivot(0, 1, 2, null, 0);
//box.addPivot(1, 2, 3);
//box.addPivot(2, 3, 0, null, 0);
//box.addPivot(3, 0, 1);
*/
let ox = 500, oy = 350;
/*
box.addDot(ox, oy - 0);
box.addDot(ox - 400, oy + 8);
box.addDot(ox + 400, oy + 8);


box.pinPoint(1);

box.addStick(0, 1); //0
box.addStick(1, 2); //1
box.addStick(2, 0); //2

box.addPivot(0, 1);
box.addPivot(1, 2);
box.addPivot(2, 0);


canvas.addEventListener("mousedown", function (e) {
  e.preventDefault();

  box.unpinPoint(1);

  return false;
}, false);
*/

/*
box.addDot(ox + 350, oy - 0, -Math.random() * 80, Math.random() * 80);
box.addDot(ox + 350, oy - 125);
box.addDot(ox + 250, oy - 125);
box.addDot(ox + 250, oy - 75);
box.addDot(ox + 50, oy - 75);
box.addDot(ox + 50, oy - 0);

box.pinPoint(5);

box.addStick(0, 1); //0
box.addStick(1, 2); //1
box.addStick(2, 3); //2
box.addStick(3, 4); //3
box.addStick(4, 5); //4
box.addStick(5, 0); //5

box.addPivot(1, 0);
box.addPivot(2, 1);
box.addPivot(3, 2);
box.addPivot(3, 4);
box.addPivot(5, 4);
box.addPivot(0, 5);

canvas.addEventListener("mousedown", function (e) {
  e.preventDefault();

  box.unpinPoint(5);

  return false;
}, false);
*/

/*
box.addDot(ox + 0, oy - 0);
box.addDot(ox + 0, oy - 50);
box.addDot(ox + 0, oy - 200);
box.addDot(ox + 0, oy - 250);

box.addDot(ox + 100, oy - 50);
box.addDot(ox + 100, oy - 200);
box.addDot(ox + 100, oy - 250);

box.addStick(0, 1); //0
box.addStick(1, 2); //1
box.addStick(2, 3); //2

box.addStick(4, 5); //3
box.addStick(5, 6); //4

box.addStick(3, 6); //5
box.addStick(2, 5); //6
box.addStick(1, 4); //7

box.addPivot(7, 0);

box.addPivot(1, 7);
box.addPivot(6, 1);

box.addPivot(2, 6);
box.addPivot(5, 2);

box.addPivot(4, 5);
box.addPivot(4, 6);

box.addPivot(3, 6);
box.addPivot(3, 7);

*/
/*

box.addDot(ox + 0, oy + 0);
box.addDot(ox + 0, oy + 100);
box.addDot(ox + 50, oy + 100);
box.addDot(ox + 100, oy + 50);
box.addDot(ox + 150, oy + 50);
box.addDot(ox + 200, oy + 100);
box.addDot(ox + 250, oy + 100);
box.addDot(ox + 250, oy + 0);

box.pinPoint(7);

box.addStick(0, 1); //0
box.addStick(1, 2); //1
box.addStick(2, 3); //2
box.addStick(3, 4); //3
box.addStick(4, 5); //4
box.addStick(5, 6); //5
box.addStick(6, 7); //6
box.addStick(7, 0); //7

box.addPivot(0, 1, 10 / 180 * Math.PI);
box.addPivot(1, 2, 10 / 180 * Math.PI);
box.addPivot(2, 3, 10 / 180 * Math.PI);
//box.addPivot(3, 4);
//box.addPivot(4, 5);
//box.addPivot(5, 6);
//box.addPivot(6, 7);
//box.addPivot(7, 0);

let togglePin = false;

canvas.addEventListener("mousedown", function (e) {
  e.preventDefault();

  if (e.button == 0) {
    if (togglePin) {
      box.unpinPoint(7);
      box.pinPoint(0);
    } else {
      box.unpinPoint(0);
      box.pinPoint(7);
    }      
  } else {
    box.unpinPoint(7);
    box.unpinPoint(0);
  }

  box.render(ctx);

  togglePin = !togglePin;

  return false;
}, false);
*/

let sides = 50;
let diameter = 100;
for (var s = 0; s < sides; s++) {
  let s_step = (2 * Math.PI) / sides;
  let s_angle = s_step * s;

  let px = Math.cos(s_angle) * diameter;
  let py = Math.sin(s_angle) * diameter;

  if (s == 0)
    box.addDot(ox + px, oy - py, -Math.random() * 2, Math.random() * 2);
  else
    box.addDot(ox + px, oy - py);
}
//box.dots[0].pos.x += 1;
box.dots[0].color = '#f00';

for (var s = 0; s < sides; s++)
  box.addStick(s, (s + 1) % sides);

let n = box.sticks.length;

for (var s = 0; s < n; s++) {
  try {
    box.addPivot(s, (s + 1) % n);

  } catch (ex) {
    console.log(s, s + 1);
  }

}
//  box.pinPoint(n );
box.pinPoint(0);

canvas.addEventListener("mousedown", function (e) {
  e.preventDefault();

  box.unpinPoint(0);

  return false;
}, false);




let stop = false;

function animate() {
  

  box.update(ctx);
    

  if (!stop) requestAnimationFrame(animate);
}
//animate();
box.render(ctx);

function Stop() { stop = true; }

/*
canvas.addEventListener("mousedown", function (e) {
  e.preventDefault();

  if (e.button == 0) {
    box.addDot(e.clientX, e.clientY);
  }
  if (e.button == 2) {
    let p = box.dots.length ;
    for (var s = 0; s < p - (e.ctrlKey ? 1 : 0); s++)
      box.addStick(s, (s + 1) % p);
    
    let n = box.sticks.length;
    
    for (var s = 0; s < n; s++) {
      try {
        box.addPivot(s, (s + 1) % n);
    
      } catch (ex) {
        console.log(s, s + 1);
      }
    
    }

    DEBUG = false;
    animate();
  }

  box.render(ctx);

  return false;
}, false);
*/
/*

let dot_A = new Dot(0, 0, 0, 0, '#f00');
let dot_B = new Dot(500, 500, 0, 0, '#0f0');
let dot_C = new Dot(0, 0, 0, 0, '#00f');

dot_A.pinned = true;

box.dots.push(dot_A);
box.dots.push(dot_B);
box.dots.push(dot_C);

box.addStick(0, 1);
box.addStick(1, 2);

box.addPivot(0, 1, 2);

function correct(angle) {
  let angle_rad = angle / 180 * Math.PI;

  let dot_S = dot_A;
  let dot_M = dot_B;
  let dot_E = dot_C;

  let v1 = Vector.sub(dot_M.pos, dot_S.pos);
  let v2 = Vector.sub(dot_M.pos, dot_E.pos);

  let ha = v1.heading();
  let hb = v2.heading();

  let act_diff = ha - hb;
  let act_angle = act_diff < 0 ? (2 * Math.PI)+act_diff : act_diff;

  let diff_angle = angle_rad - act_angle;
  console.log(`Diff: ${diff_angle / Math.PI * 180}`);

  //let m1 = Math.abs(diff_angle / ((2 * Math.PI) - angle_rad));
  //console.log(m1);
  
  let m1 = v1.magSq() + v2.magSq();
  let m2 = v1.magSq() / m1;
  m1 = v2.magSq() / m1;

  if (dot_S.pinned && dot_E.pinned) return;

  if (dot_S.pinned && !dot_E.pinned) {
    v1.rotate(diff_angle * m1);
    dot_M.pos.x = dot_S.pos.x + v1.x;
    dot_M.pos.y = dot_S.pos.y + v1.y;
  
    v2.rotate(-diff_angle * m2);
    dot_E.pos.x = dot_M.pos.x - v2.x;
    dot_E.pos.y = dot_M.pos.y - v2.y;
  }

  if (!dot_S.pinned && dot_E.pinned) {
    v2.rotate(-diff_angle * m2);
    dot_M.pos.x = dot_E.pos.x + v2.x;
    dot_M.pos.y = dot_E.pos.y + v2.y;
  
    v1.rotate(diff_angle * m1);
    dot_S.pos.x = dot_M.pos.x - v1.x;
    dot_S.pos.y = dot_M.pos.y - v1.y;
  }

  if (!dot_S.pinned && !dot_E.pinned) {
    v1.rotate(diff_angle * m1);
    dot_S.pos.x = dot_M.pos.x - v1.x;
    dot_S.pos.y = dot_M.pos.y - v1.y;
  
    v2.rotate(-diff_angle * m2);
    dot_E.pos.x = dot_M.pos.x - v2.x;
    dot_E.pos.y = dot_M.pos.y - v2.y;
  }



  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  box.render(ctx);
}

canvas.addEventListener("mousedown", function (e) {
  e.preventDefault();

  console.log(e);

  if (e.button == 0) {
    dot_A.pos.x = e.clientX;
    dot_A.pos.y = e.clientY;
    dot_A.freeze();
  }
  if (e.button == 2) {
    dot_C.pos.x = e.clientX;
    dot_C.pos.y = e.clientY;
    dot_C.freeze();
  }

  if (e.ctrlKey)
    box.recalculate();

  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  box.render(ctx);

  return false;
}, false);
box.render(ctx);
*/