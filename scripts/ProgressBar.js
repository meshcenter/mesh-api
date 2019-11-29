const colors = require("colors");
const readline = require("readline");

const CLEAR_WHOLE_LINE = 0;
const CLEAR_RIGHT_OF_CURSOR = 1;

function ProgressBar(total) {
  this.stdout = process.stdout;
  this.total = total;
  this.chars = ["█", "░"];
  this.delay = 60;
  this.curr = 0;
}

ProgressBar.prototype.tick = function() {
  if (this.curr >= this.total) {
    return;
  }

  this.curr++;

  // schedule render
  if (!this.id) {
    this.id = setTimeout(() => this.render(), this.delay);
  }
};

ProgressBar.prototype.stop = function() {
  // "stop" by setting current to end so `tick` becomes noop
  this.curr = this.total;

  clearLine(this.stdout);
  if (this._callback) {
    this._callback(this);
  }
};

ProgressBar.prototype.render = function() {
  let ratio = this.curr / this.total;
  ratio = Math.min(Math.max(ratio, 0), 1);

  // progress without bar
  let bar = ` ${this.curr}/${this.total}`;

  // calculate size of actual bar
  // $FlowFixMe: investigate process.stderr.columns flow error
  const availableSpace = Math.max(0, this.stdout.columns - bar.length - 1);
  const width = Math.min(this.total, availableSpace);
  const completeLength = Math.round(width * ratio);
  const complete = colors.green("█").repeat(completeLength);
  const incomplete = "░".repeat(width - completeLength);
  bar = `${complete}${incomplete}${bar}`;

  toStartOfLine(this.stdout);
  this.stdout.write(bar);
};

function clearLine(stdout) {
  readline.clearLine(stdout, CLEAR_WHOLE_LINE);
  readline.cursorTo(stdout, 0);
}

function toStartOfLine(stdout) {
  readline.cursorTo(stdout, 0);
}

module.exports = ProgressBar;
