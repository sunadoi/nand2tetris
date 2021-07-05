// This file is part of www.nand2tetris.org
// and the book "The Elements of Computing Systems"
// by Nisan and Schocken, MIT Press.
// File name: projects/04/Fill.asm

// Runs an infinite loop that listens to the keyboard input.
// When a key is pressed (any key), the program blackens the screen,
// i.e. writes "black" in every pixel;
// the screen should remain fully black as long as the key is pressed. 
// When no key is pressed, the program clears the screen, i.e. writes
// "white" in every pixel;
// the screen should remain fully clear as long as no key is pressed.

	// R0: if keyboard is pushed in previous term then 1
  // R1: if keyboard is pushed in current term then 1

  @8192 // screen size 32*256
  D=A
  @number_of_pixel
  M=D // number_of_pixel=8192
  @R0
  M=0 // init
(LOOP)
  @KBD
  D=M
  @KEY_PUSHED
  D;JNE // if KBD != 0 goto KEY_PUSHED
(KEY_NOT_PUSHED)
  @R1
  M=0
  @CHECK_STATE_CHANGE
  0;JMP
(KEY_PUSHED)
  @R1
  M=1
(CHECK_STATE_CHANGE)
  @R0
  D=M
  @R1
  D=D-M // R0-R1
  @LOOP
  D;JEQ   // if D == 0 goto LOOP 入力に変化なし

  @R1
  D=M // D=R1
  @R0
  M=D // R0=R1 状態の更新

  @SET_WHITE
  D;JEQ // if D == 0 goto WHITE_LOOP
(SET_BLACK)
  @color
  M=-1 // color=-1
  @INIT_POSITION
  0;JMP
(SET_WHITE)
  @color
  M=0 // color=0
(INIT_POSITION)
  @SCREEN
  D=A // D=16384
  @position
  M=D
  @count
  M=0
(SCREEN_LOOP)
  @count
  D=M
  @number_of_pixel
  D=M-D // D=number_of_pixel - count
  @LOOP
  D;JLE // if D <= 0 goto LOOP 終了条件

  @color
  D=M
  @position
  A=M
  M=D

  @position
  M=M+1
  @count
  M=M+1
  @SCREEN_LOOP
  0;JMP
