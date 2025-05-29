import Enum from '@/enum'

describe('Enum', () => {
  describe('string[]', () => {
    const Colors = Enum(['RED', 'GREEN', 'BLUE'] as const)

    it('should map keys to values', () => {
      expect(Colors.RED).toBe('RED')
      expect(Colors.GREEN).toBe('GREEN')
    })

    it('should check has()', () => {
      expect(Colors.has('RED')).toBe(true)
      expect(Colors.has('YELLOW')).toBe(false)
    })

    it('should resolve key()', () => {
      expect(Colors.key('RED')).toBe('RED')
      expect(Colors.key('YELLOW')).toBe(null)
    })

    it('should resolve value()', () => {
      expect(Colors.value('RED')).toBe('RED')
      expect(Colors.value('YELLOW')).toBe(null)
    })

    it('should expose keys and values', () => {
      expect(Colors.keys).toEqual(['RED', 'GREEN', 'BLUE'])
      expect(Colors.values).toEqual(['RED', 'GREEN', 'BLUE'])
    })
  })

  describe('numeric', () => {
    const Colors = Enum({ RED: 1, GREEN: 2, BLUE: 3 } as const)

    it('should map keys to values', () => {
      expect(Colors.RED).toBe(1)
      expect(Colors.GREEN).toBe(2)
    })

    it('should check has() with keys and values', () => {
      expect(Colors.has('RED')).toBe(true)
      expect(Colors.has(1)).toBe(true)
      expect(Colors.has('1')).toBe(true)
      expect(Colors.has('YELLOW')).toBe(false)
      expect(Colors.has(4)).toBe(false)
    })

    it('should resolve key()', () => {
      expect(Colors.key('RED')).toBe('RED')
      expect(Colors.key(1)).toBe('RED')
      expect(Colors.key('1')).toBe('RED')
      expect(Colors.key('YELLOW')).toBe(null)
      expect(Colors.key(4)).toBe(null)
    })

    it('should resolve value()', () => {
      expect(Colors.value('RED')).toBe(1)
      expect(Colors.value(1)).toBe(1)
      expect(Colors.value('1')).toBe(1)
      expect(Colors.value('YELLOW')).toBe(null)
      expect(Colors.value(4)).toBe(null)
    })

    it('should expose keys and values', () => {
      expect(Colors.keys).toEqual(['RED', 'GREEN', 'BLUE'])
      expect(Colors.values).toEqual([1, 2, 3])
    })
  })

  describe('alias string', () => {
    const Colors = Enum({ RED: 'r1', GREEN: 'g1', BLUE: 'b1' } as const)

    it('should map keys to values', () => {
      expect(Colors.RED).toBe('r1')
      expect(Colors.GREEN).toBe('g1')
    })

    it('should check has() with keys and values', () => {
      expect(Colors.has('RED')).toBe(true)
      expect(Colors.has('r1')).toBe(true)
      expect(Colors.has('YELLOW')).toBe(false)
      expect(Colors.has('y4')).toBe(false)
    })

    it('should resolve key()', () => {
      expect(Colors.key('RED')).toBe('RED')
      expect(Colors.key('r1')).toBe('RED')
      expect(Colors.key('YELLOW')).toBe(null)
      expect(Colors.key('y4')).toBe(null)
    })

    it('should resolve value()', () => {
      expect(Colors.value('RED')).toBe('r1')
      expect(Colors.value('r1')).toBe('r1')
      expect(Colors.value('YELLOW')).toBe(null)
      expect(Colors.value('y4')).toBe(null)
    })

    it('should expose keys and values', () => {
      expect(Colors.keys).toEqual(['RED', 'GREEN', 'BLUE'])
      expect(Colors.values).toEqual(['r1', 'g1', 'b1'])
    })
  })
})
