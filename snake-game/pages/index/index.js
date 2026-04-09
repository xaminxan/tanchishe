Page({
  data: {
    canvasWidth: 300,
    canvasHeight: 300,
    gridSize: 15,
    score: 0,
    highScore: 0,
    isPlaying: false,
    isGameOver: false,
    snake: [],
    food: {},
    direction: 'right',
    nextDirection: 'right'
  },

  ctx: null,
  gameLoop: null,
  speed: 200,

  onLoad() {
    // 从本地存储获取最高分
    const highScore = wx.getStorageSync('snakeHighScore') || 0;
    this.setData({ highScore });
    
    // 初始化画布
    this.initCanvas();
  },

  initCanvas() {
    const query = wx.createSelectorQuery();
    query.select('#gameCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (res[0]) {
          const canvas = res[0].node;
          this.ctx = canvas.getContext('2d');
          
          // 设置画布实际大小
          const dpr = wx.getSystemInfoSync().pixelRatio;
          canvas.width = this.data.canvasWidth * dpr;
          canvas.height = this.data.canvasHeight * dpr;
          this.ctx.scale(dpr, dpr);
          
          // 绘制初始画面
          this.drawGame();
        }
      });
  },

  startGame() {
    const gridSize = this.data.gridSize;
    const gridCount = Math.floor(this.data.canvasWidth / gridSize);
    
    // 初始化蛇的位置（中间）
    const startX = Math.floor(gridCount / 2);
    const startY = Math.floor(gridCount / 2);
    
    this.setData({
      snake: [
        { x: startX, y: startY },
        { x: startX - 1, y: startY },
        { x: startX - 2, y: startY }
      ],
      direction: 'right',
      nextDirection: 'right',
      score: 0,
      isGameOver: false,
      isPlaying: true
    });

    this.generateFood();
    
    if (this.gameLoop) {
      clearInterval(this.gameLoop);
    }
    
    this.gameLoop = setInterval(() => {
      this.moveSnake();
    }, this.speed);
  },

  generateFood() {
    const gridSize = this.data.gridSize;
    const gridCount = Math.floor(this.data.canvasWidth / gridSize);
    const snake = this.data.snake;
    
    let food;
    do {
      food = {
        x: Math.floor(Math.random() * gridCount),
        y: Math.floor(Math.random() * gridCount)
      };
    } while (snake.some(segment => segment.x === food.x && segment.y === food.y));
    
    this.setData({ food });
  },

  moveSnake() {
    if (!this.data.isPlaying || this.data.isGameOver) return;

    const snake = [...this.data.snake];
    const head = { ...snake[0] };
    const direction = this.data.nextDirection;

    // 更新方向
    this.setData({ direction });

    // 根据方向移动蛇头
    switch (direction) {
      case 'up':
        head.y -= 1;
        break;
      case 'down':
        head.y += 1;
        break;
      case 'left':
        head.x -= 1;
        break;
      case 'right':
        head.x += 1;
        break;
    }

    // 检查碰撞
    if (this.checkCollision(head)) {
      this.gameOver();
      return;
    }

    // 将新头部添加到蛇的前面
    snake.unshift(head);

    // 检查是否吃到食物
    const food = this.data.food;
    if (head.x === food.x && head.y === food.y) {
      // 吃到食物，增加分数
      const newScore = this.data.score + 10;
      const newHighScore = Math.max(newScore, this.data.highScore);
      
      this.setData({
        score: newScore,
        highScore: newHighScore
      });
      
      // 保存最高分到本地存储
      wx.setStorageSync('snakeHighScore', newHighScore);
      
      // 生成新食物
      this.generateFood();
    } else {
      // 没吃到食物，移除尾部
      snake.pop();
    }

    this.setData({ snake });
    this.drawGame();
  },

  checkCollision(head) {
    const snake = this.data.snake;
    const gridSize = this.data.gridSize;
    const gridCount = Math.floor(this.data.canvasWidth / gridSize);

    // 检查边界碰撞
    if (head.x < 0 || head.x >= gridCount || head.y < 0 || head.y >= gridCount) {
      return true;
    }

    // 检查自身碰撞（跳过蛇头）
    for (let i = 0; i < snake.length; i++) {
      if (snake[i].x === head.x && snake[i].y === head.y) {
        return true;
      }
    }

    return false;
  },

  gameOver() {
    clearInterval(this.gameLoop);
    this.setData({
      isPlaying: false,
      isGameOver: true
    });
    
    wx.showToast({
      title: '游戏结束！',
      icon: 'none',
      duration: 1500
    });
  },

  drawGame() {
    if (!this.ctx) return;

    const { canvasWidth, canvasHeight, gridSize, snake, food } = this.data;
    
    // 清空画布
    this.ctx.fillStyle = '#f0f0f0';
    this.ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // 绘制网格线（可选）
    this.ctx.strokeStyle = '#e0e0e0';
    this.ctx.lineWidth = 0.5;
    for (let i = 0; i <= canvasWidth; i += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(i, 0);
      this.ctx.lineTo(i, canvasHeight);
      this.ctx.stroke();
    }
    for (let i = 0; i <= canvasHeight; i += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, i);
      this.ctx.lineTo(canvasWidth, i);
      this.ctx.stroke();
    }

    // 绘制蛇
    snake.forEach((segment, index) => {
      const x = segment.x * gridSize;
      const y = segment.y * gridSize;
      
      if (index === 0) {
        // 蛇头用深绿色
        this.ctx.fillStyle = '#2E7D32';
      } else {
        // 蛇身用浅绿色
        this.ctx.fillStyle = '#4CAF50';
      }
      
      this.ctx.fillRect(x + 1, y + 1, gridSize - 2, gridSize - 2);
      
      // 绘制蛇眼睛（仅蛇头）
      if (index === 0) {
        this.ctx.fillStyle = 'white';
        const eyeSize = 3;
        const eyeOffset = 4;
        
        // 根据方向调整眼睛位置
        let leftEyeX, leftEyeY, rightEyeX, rightEyeY;
        
        switch (this.data.direction) {
          case 'up':
            leftEyeX = x + eyeOffset;
            leftEyeY = y + eyeOffset;
            rightEyeX = x + gridSize - eyeOffset - eyeSize;
            rightEyeY = y + eyeOffset;
            break;
          case 'down':
            leftEyeX = x + eyeOffset;
            leftEyeY = y + gridSize - eyeOffset - eyeSize;
            rightEyeX = x + gridSize - eyeOffset - eyeSize;
            rightEyeY = y + gridSize - eyeOffset - eyeSize;
            break;
          case 'left':
            leftEyeX = x + eyeOffset;
            leftEyeY = y + eyeOffset;
            rightEyeX = x + eyeOffset;
            rightEyeY = y + gridSize - eyeOffset - eyeSize;
            break;
          case 'right':
          default:
            leftEyeX = x + gridSize - eyeOffset - eyeSize;
            leftEyeY = y + eyeOffset;
            rightEyeX = x + gridSize - eyeOffset - eyeSize;
            rightEyeY = y + gridSize - eyeOffset - eyeSize;
            break;
        }
        
        this.ctx.fillRect(leftEyeX, leftEyeY, eyeSize, eyeSize);
        this.ctx.fillRect(rightEyeX, rightEyeY, eyeSize, eyeSize);
      }
    });

    // 绘制食物（红色苹果）
    if (food) {
      const x = food.x * gridSize;
      const y = food.y * gridSize;
      
      this.ctx.fillStyle = '#F44336';
      this.ctx.beginPath();
      this.ctx.arc(
        x + gridSize / 2,
        y + gridSize / 2,
        gridSize / 2 - 2,
        0,
        Math.PI * 2
      );
      this.ctx.fill();
      
      // 绘制苹果的叶子
      this.ctx.fillStyle = '#4CAF50';
      this.ctx.beginPath();
      this.ctx.ellipse(
        x + gridSize / 2,
        y + 3,
        3,
        2,
        Math.PI / 4,
        0,
        Math.PI * 2
      );
      this.ctx.fill();
    }
  },

  changeDirection(newDirection) {
    const opposites = {
      'up': 'down',
      'down': 'up',
      'left': 'right',
      'right': 'left'
    };

    // 防止直接反向
    if (opposites[newDirection] !== this.data.direction) {
      this.setData({ nextDirection: newDirection });
    }
  },

  handleUp() {
    if (this.data.isPlaying && !this.data.isGameOver) {
      this.changeDirection('up');
    }
  },

  handleDown() {
    if (this.data.isPlaying && !this.data.isGameOver) {
      this.changeDirection('down');
    }
  },

  handleLeft() {
    if (this.data.isPlaying && !this.data.isGameOver) {
      this.changeDirection('left');
    }
  },

  handleRight() {
    if (this.data.isPlaying && !this.data.isGameOver) {
      this.changeDirection('right');
    }
  },

  handleStart() {
    if (this.data.isGameOver) {
      this.startGame();
    } else if (this.data.isPlaying) {
      // 暂停游戏
      clearInterval(this.gameLoop);
      this.setData({ isPlaying: false });
    } else {
      // 开始游戏
      this.startGame();
    }
  },

  onUnload() {
    if (this.gameLoop) {
      clearInterval(this.gameLoop);
    }
  }
});
