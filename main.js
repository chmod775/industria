let canvas = document.getElementById("c");
let ctx = canvas.getContext("2d");
let CANVAS_WIDTH = window.innerWidth-20;
let CANVAS_HEIGHT = window.innerHeight-20;
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

class Dot {
  constructor(x, y, vx, vy) {
    this.pos = new Vector(x, y);
    this.oldpos = new Vector(x + (vx||0), y + (vy||0)); // velocity x, y

    this.friction = 0.97;
    this.groundFriction = 0.7;

    this.gravity = new Vector(0, 1);

    this.radius = 5;
    this.color = "#000";
    this.mass = 1;
  }

  update() {
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
    if (this.pos.y > CANVAS_HEIGHT - this.radius) {
      this.pos.y = CANVAS_HEIGHT - this.radius;
    }
    if (this.pos.y < this.radius) {
      this.pos.y = this.radius;
    }
  };
  
  render(ctx) {
    ctx.beginPath();
    ctx.fillStyle = this.color;
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

class Pivot {
  constructor(p1, p2, p3, angle) {
    this.startPoint = p1;
    this.middlePoint = p2;
    this.endPoint = p3;

    this.stiffness = 2;

    this.color = '#000';

    if (!angle) {
      let v1 = Vector.sub(this.middlePoint.pos, this.startPoint.pos);
      let v2 = Vector.sub(this.middlePoint.pos, this.endPoint.pos);

      let diff = (v1.headingAbs() - v2.headingAbs()) ;

      this.angle = mod((diff + Math.PI), (2*Math.PI)) - Math.PI;

      console.log(this.startPoint.pos, this.middlePoint.pos, this.endPoint.pos)

      //console.log(v1.heading(), v2.heading(), this.angle);
      console.log(v1.headingAbs(), v2.headingAbs(), this.angle / Math.PI * 180);
    } else {
      this.angle = angle;
    }
  }

  update() {
    let v1 = Vector.sub(this.middlePoint.pos, this.startPoint.pos);
    let v2 = Vector.sub(this.middlePoint.pos, this.endPoint.pos);

    let act_diff = v1.headingAbs() - v2.headingAbs();;
    let act_angle = mod((act_diff + Math.PI), (2*Math.PI)) - Math.PI;

    let diff_angle = (act_angle - this.angle) * 0.5;

    // calculate mass
    /*
    let m1 = this.startPoint.mass + this.endPoint.mass;
    let m2 = this.startPoint.mass / m1;
    m1 = this.endPoint.mass / m1;
*/
    if (!this.startPoint.pinned) {
      v1.rotate(-diff_angle);
      this.startPoint.pos = Vector.sub(this.middlePoint.pos, v1);
    }

    if (!this.endPoint.pinned) {
      v2.rotate(diff_angle);
      this.endPoint.pos = Vector.sub(this.middlePoint.pos, v2);
    }
  }

  render(ctx) {
    ctx.beginPath();
    ctx.fillStyle = '#f00';
    ctx.arc(this.startPoint.pos.x, this.startPoint.pos.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.closePath();

    ctx.beginPath();
    ctx.strokeStyle = this.color;

    let a1 = Vector.sub(this.middlePoint.pos, this.startPoint.pos).headingAbs();
    let a2 = Vector.sub(this.middlePoint.pos, this.endPoint.pos).headingAbs();    
    
    ctx.arc(this.middlePoint.pos.x, this.middlePoint.pos.y, 10, a2 + Math.PI, a1 + Math.PI);
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

  addDot(x, y, vx, vy) {
    this.dots.push(new Dot(x, y, vx, vy));
  }

  addStick(p1, p2, length) {
    this.sticks.push(new Stick(this.dots[p1], this.dots[p2], length));
  }

  addPivot(p1, p2, p3, angle) {
    this.pivots.push(new Pivot(this.dots[p1], this.dots[p2], this.dots[p3], angle));
  }

  updatePoints() {
    for (let i = 0; i < this.dots.length; i++) {
      this.dots[i].update();
    }
  }

  updateSticks() {
    for (let i = 0; i < this.sticks.length; i++) {
      this.sticks[i].update();
    }
  }

  updatePivots() {
    for (let i = 0; i < this.pivots.length; i++) {
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
    for (let j = 0; j < this.iterations; j++) {
      this.updatePivots();
      this.updateSticks();
      this.updateContrains();
    }
    this.render(ctx);
  }

  render(ctx) {
    this.renderPoints(ctx);
    this.renderSticks(ctx);
    this.renderPivots(ctx);
  }
}

let box = new Entity(100);
box.addDot(300, 300, 0, Math.random() * 100.0); //x, y, vx, vy
box.addDot(400, 300);
box.addDot(400, 400);
box.addDot(300, 400);

box.addStick(0, 1);
box.addStick(1, 2);
box.addStick(2, 3);
box.addStick(3, 0);

box.addPivot(0, 1, 2);
box.addPivot(1, 2, 3);
box.addPivot(2, 3, 0);
box.addPivot(3, 0, 1);


function animate() {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  box.update(ctx);
    

  requestAnimationFrame(animate);
}

box.render(ctx);