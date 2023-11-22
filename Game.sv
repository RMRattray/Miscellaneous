//
//    9999999      9999999
//  999     999  999     999
//  999     999  999     999
//    99999999     99999999
//        999          999
//       999          999
//      999          999
// Ninety-Nine:  a game for SystemVerilog

// This file is a Verilog file meant to run on the ECE270 FPGA used in school.
// It implements a game in the vein of rhythm arcade games (e.g. Guitar Hero, Dance Dance Revolution)
// wherein the player tries to press an indicated key in an increasingly short span of time - 
// initially, the player has 99 centiseconds, but this ticks down with every success.  Low scores win.

`default_nettype none
// Empty top module

module top (
  // I/O ports
  input  logic hz100, reset,
  input  logic [20:0] pb,
  output logic [7:0] left, right,
         ss7, ss6, ss5, ss4, ss3, ss2, ss1, ss0,
  output logic red, green, blue,

  // UART ports
  output logic [7:0] txdata,
  input  logic [7:0] rxdata,
  output logic txclk, rxclk,
  input  logic txready, rxready
);

  // keysync k0( .clk(hz100), .rst(reset), .ins(pb[15:10]), .keyclk(red), .choice(right[2:0]));
  // logic [7:0] num;
  // logic [7:0] score;
  // ssdec s0( .in(num[7:4]), .enable(1'b1), .out(ss1[6:0]));
  // ssdec s1( .in(num[3:0]), .enable(1'b1), .out(ss0[6:0]));
  // ssdec sa( .in(pb[7:4]), .enable(1'b1), .out(ss5[6:0]));
  // ssdec sb( .in(pb[3:0]), .enable(1'b1), .out(ss4[6:0]));
  // bcdinc b0( .indigs(pb[7:0]), .dec(pb[19]), .outdigs(num));
  // assign score = 8'h42;
  // timer t0( .clk(hz100), .rst(pb[19]), .score(score), .time_now(num), .time_up(red));
  // leveler l0( .clk(hz100), .rst(pb[19]), .state(pb[7:5]), .n_state(ss0[2:0]), .dot(dot));
  // lights l1( .dot(dot), .left(left), .right(right));
 
  logic [2:0] dot, keyout, state, next_level;
  logic keyclk, time_up;
  logic [7:0] time_now, score;
  assign red = time_up & |state;
  
  assign right[2:0] = state;
 
  keysync k0( .clk(hz100), .rst(reset), .ins(pb[15:10]), .keyclk(keyclk), .choice(keyout));
  timer t0( .clk(hz100), .rst(reset), .keyclk(keyclk), .score(score), .time_now(time_now), .time_up(time_up));
 
  leveler l0( .clk(hz100), .rst(reset), .state(state), .n_state(next_level), .dot(dot));
  // lights l1( .dot(dot), .left(left), .right(right));
 
  central c0( .rst(reset), .time_up(time_up), .keyclk(keyclk), .keyout(keyout), .n_state(next_level), .score(score), .state(state));
  display d0( .state(state), .time_now(time_now), .score(score), .ss7(ss7), .ss6(ss6), .ss5(ss5), .ss4(ss4), .ss3(ss3), .ss2(ss2), .ss1(ss1), .ss0(ss0) );
endmodule

// Central module controls the state, setting it to seven when time runs out in gameplay
// or a player hits the wrong key, or to the next level should a player hit the correct key.
// "State" is 000 in the beginning, "111" after the game, and some value in between during the 
// game, that valuing indicating the key that the player is instructed to hit.

// This module also decrements and resets the score.
module central (
  input logic rst, time_up, keyclk,
  input logic [2:0] keyout,
  input logic [2:0] n_state,
  output logic [7:0] score,
  output logic [2:0] state);

  logic [2:0] real_n_state;
  logic [7:0] real_n_score, n_score;
  
  bcdec b0( .indigs(score), .outdigs(n_score));
 
  always_comb begin
    if ( ~|state & keyout == 3'b001 ) begin
      real_n_state = n_state;
      real_n_score = 8'h99;
    end
    else if (time_up) begin
      real_n_state = 3'b111;
      real_n_score = score;
    end
    else if ( keyout == state ) begin
      real_n_state = n_state;
      real_n_score = n_score;
    end
    else begin
      real_n_state = 3'b111;
      real_n_score = score;
    end
  end
 
  always_ff @ (posedge rst or posedge keyclk) begin
    if (rst) begin
      state <= 3'b000;
      score <= 8'h99;
    end
    else begin
      state <= real_n_state;
      score <= real_n_score;
    end
  end

endmodule

// The display module displays "A to start" at the beginning of the game,
// a letter, timer and score during play,
// and the final score at the end.
module display (
  input logic [2:0] state,
  input logic [7:0] time_now, score,
  output logic [7:0] ss7, ss6, ss5, ss4, ss3, ss2, ss1, ss0);

  logic [15:0] time_bus, score_bus;
  ssdec s0( .in(time_now[7:4]), .enable(1'b1), .out(time_bus[14:8]));
  ssdec s1( .in(time_now[3:0]), .enable(1'b1), .out(time_bus[6:0]));
  ssdec s2( .in(score[7:4]), .enable(1'b1), .out(score_bus[14:8]));
  ssdec s3( .in(score[3:0]), .enable(1'b1), .out(score_bus[6:0]));
  assign { score_bus[15], time_bus[15], score_bus[7], time_bus[7] } = 4'b0000;
 
  logic [7:0] state_bus;
  always_comb begin
    case (state)
      3'b001: state_bus = 8'b01110111;
      3'b010: state_bus = 8'b01111100;
      3'b011: state_bus = 8'b00111001;
      3'b100: state_bus = 8'b01011110;
      3'b101: state_bus = 8'b01111001;
      3'b110: state_bus = 8'b01110001;
      default: state_bus = 8'b00000000;
    endcase
  end
 
  always_comb begin
    case (state)                                          // "AtoStArt" and "ScorE", respectively
    3'b000: { ss7, ss6, ss5, ss4, ss3, ss2, ss1, ss0 } = 64'b01110111_01111000_01011100_01101101_01111000_01110111_01010000_01111000;
    3'b111: { ss7, ss6, ss5, ss4, ss3, ss2, ss1, ss0 } = { 48'b01101101_01011000_01011100_01010000_01111001_01000000, score_bus };
    default: { ss7, ss6, ss5, ss4, ss3, ss2, ss1, ss0 } = { state_bus, 8'b0, time_bus, 16'b0, score_bus };
    endcase
  end

endmodule

// The lights module is a double decoder - it indicates
// the position of the leveler module's register
// on the left and right lights.
module lights (
  input logic [2:0] dot,
  output logic [7:0] left, right);
 
  logic [7:0] m;
  assign m[0] = (dot == 3'b111);
  assign m[1] = (dot == 3'b110);
  assign m[2] = (dot == 3'b101);
  assign m[3] = (dot == 3'b100);
  assign m[4] = (dot == 3'b011);
  assign m[5] = (dot == 3'b010);
  assign m[6] = (dot == 3'b001);
  assign m[7] = (dot == 3'b000);
 
  assign right[7:0] = m[7:0];
  assign left[0] = m[7];
  assign left[1] = m[6];
  assign left[2] = m[5];
  assign left[3] = m[4];
  assign left[4] = m[3];
  assign left[5] = m[2];
  assign left[6] = m[1];
  assign left[7] = m[0];

endmodule

// The leveler module ticks a register on every
// clock tick and uses this to calculate a different
// next level (1-6) should the player hit the correct key on any tick.
module leveler (
  input logic clk, rst,
  input logic [2:0] state,
  output logic [2:0] n_state,
  output logic [2:0] dot);
 
  logic [2:0] diff;
  logic [2:0] t_state;
 
  always_ff @ (posedge clk or posedge rst) begin
    if (rst) diff <= 3'b000;
    else diff <= diff + 1;
  end
 
  assign dot = diff;
 
  always_comb begin
    t_state = state + diff;
    n_state = (|t_state && ~&t_state) ? t_state : (~&diff ? diff : 3'b001 );
  end
 
endmodule

// The timer module resets a timer to the score input
// and decrements until zero and releases time-is-up.
module timer (
  input logic clk, rst, keyclk,
  input logic [7:0] score,
  output logic [7:0] time_now,
  output logic time_up);

  logic [7:0] next_time, time_minus_one;
  bcdec b0( .indigs(time_now), .outdigs(time_minus_one));
  assign time_up = ~|time_now[7:0];
  
  always_comb begin
    if (keyclk) next_time = score;
    else if (|time_now) next_time = time_minus_one;
    else next_time = 8'b0;
  end
 
  always_ff @ (posedge clk or posedge rst) begin
    if (rst) time_now <= 8'h99;
    else time_now <= next_time;
  end

endmodule

// The keysync module sends
// an output signal keyclk - which indicates that a key
// is pressed - and a signal that returns 1 for A, 2 for B...
module keysync (
  input logic clk, rst,
  input logic [5:0] ins,
  output logic keyclk,
  output logic [2:0] choice);
 
  logic delay;
 
  always_ff @ (posedge clk or posedge rst) begin
    if (rst) begin
      keyclk <= 1'b0;
      delay <= 1'b0;
      choice <= 3'b000;
    end
    else begin
      keyclk <= delay;
      delay <= |ins[5:0];
      choice[2] <= |ins[5:3];
      choice[1] <= ins[1] | ins[2] | ins[5];
      choice[0] <= ins[0] | ins[2] | ins[4];
    end
  end
     
endmodule

// The bcdec module takes as input a byte of two BCD digits,
// decrements it, and outputs the result.
module bcdec(
  input logic [7:0] indigs,
  output logic [7:0] outdigs);

  logic [1:0] vs;
  assign vs[0] = ~indigs[0];
  assign vs[1] = ~indigs[4];

  always_comb begin // Dec? 2nd dig 0?   borrow and make nine, or just sub // Not dec, at 9 ?
    if (|indigs[3:0]) begin
      outdigs[7:4] = indigs[7:4];
      outdigs[3:0] = {indigs[3] & indigs[0], indigs[2] & (|indigs[1:0]) | ~|indigs[2:0], ~^indigs[1:0], ~indigs[0] }; // { indigs[3] & indigs[0], indigs[2] & (|indigs[1:0]) | ~|indigs[2:0], ~^indigs[1:0], ~indigs[0]};
    end
    else begin
      outdigs[7:4] = {indigs[7] & indigs[4], indigs[6] & (|indigs[5:4]) | ~|indigs[6:4], ~^indigs[5:4], ~indigs[4] };
      outdigs[3:0] = 4'b1001;
    end
  end

endmodule

// The seven-seg module converts a digit 0-9 into seven bits for a seven-segment display
module seven_seg (
  input logic [3:0]in,
  output logic [6:0]out
);
  logic [6:0] SEG7 [15:0];
 
  assign SEG7[4'h0] = 7'b0111111;
  assign SEG7[4'h1] = 7'b0000110;
  assign SEG7[4'h2] = 7'b1011011;
  assign SEG7[4'h3] = 7'b1001111;
  assign SEG7[4'h4] = 7'b1100110;
  assign SEG7[4'h5] = 7'b1101101;
  assign SEG7[4'h6] = 7'b1111101;
  assign SEG7[4'h7] = 7'b1000111;
  assign SEG7[4'h8] = 7'b1111111;
  assign SEG7[4'h9] = 7'b1101111;
 
  assign out = SEG7[in];

endmodule
