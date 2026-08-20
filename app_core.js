/* ===================== 이룸편입 LMS · CORE ===================== */
const TIERS = { A:{name:'A반', sub:'SKY (서울대·연세대·고려대)', color:'#2563eb', min:80}, B:{name:'B반', sub:'서울권 상위대학', color:'#7c3aed', min:60}, C:{name:'C반', sub:'일반 대학', color:'#059669', min:0} };
const SECTIONS = { vocab:'어휘', grammar:'문법', reading:'독해', logic:'논리' };
const PERIODS = [ {p:1, t:'09:00~09:50'}, {p:2, t:'10:00~10:50'}, {p:3, t:'11:00~11:50'} ];
const LS_KEY = 'eroom_lms_v3';
const LOGO_SRC = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEACAYAAABccqhmAABRmUlEQVR42u2dd3ycxdHHf7P7PNdU3eRuMAaMK8WmlzM1AQMhhDMBYkw1EDqYGuB0dNN7sRNagBckCDW0EGwBgVBDsUUxxr0XyWpXnmd33j+e5053khxIYhks7/fzsVVOOt09z87szOwUwGAwGAwGg8FgMBgMBoPBYDAYDAaDwWAwGAwGg8FgMBgMBoPBYDAYDAaDwWAwGAwGg8FgMBgMBoPBYDAYDAaDwWAwGAwGg8FgMBgMBoPBYDAYDAaDwWAwGAwGg8FgMBgMBoPBYDAYDAaDwWAwGAwGg8FgMBgMBoPBYDAYDAaDwWAwGAwGg8FgMBgMBoPBYDAYDAaDwWAwGAwGg8FgMBgMBoPBYDAYDAaDwWAwGAwGg8FgMBh+rjCZa2AwbGbE43EBxKT/JcViMQnAKAODoQtD8ARdwJd2Zo5YMl/uo5anHAwGQ1fZ7gUQtbJf2hbh+DNuGj1i99Nv673d7xYOGnX8G9Hxl8aYOZz3W9K3CgxdflcwdElisZisrq4GAAVvtw/ve9jFh89btOLktfUN+zU7UmqlASKEAxZKQzy3T4/yxw/YY+dH77h98jyls0ZB1EJNjQLA5qoaBWD4+Zv5AtXVGgBLAfz+ggeHzPzHpxNXrG08tiHpbpNKpQHtAFK4gkgys2atAYa0bAvFIbupV/ceL27Vv/vDNa/f+mYq7eTcA8THaSQS2lxmowAMPyuYgHESqHEBIGBL7H/EpfvNnb/i1BVr6g9vSqqIchUApUAEIggGCGCAvY2dSGhm1mC2IIOIBAndIoEPB/fr86dbLvztU7sdsluDb1tIYDgDRhEYBWD4WQk+M4fHHTLlt98tXH5qXWNq95aMApQDELlEEMwsfGn3f50BYu9pKLcgmAENBgFCBAIBlBcFFvXvUfrIfruP+tPtt521QLNRBEYBGH5awY+Ok6jxBP+++17u9nDV65MXLV99Sl1TZut0xgFYaQgwgfzdHp4bz/5d5x9aEQQiaNbMYJLSkigPi4ZePbr936htt7z92Seu+kZnLQKu0iAyMQKjAAydTiwmUV2tAOD66x/t8cTL752+dNW60xtbnAFuJg1AK5AgAgQT593iPPlk9q0AyrkAgP+93K/kLw3NYCgwW2QFURwKJCu6Ff957Igt76j681VfcTZGABMsNArA0CnE43GRSCQYAK+dO7fsFyffcfp3i1ac3Zh0+7uOAxC7RCyYIX7wjvsiSkRgMIjZl3vyH6JWhZD9jvcDzCAFZksIieIAUlv0rXj0yF/ueWMiceL8tgrKYBSAYYPco6gEatxQ0Mau+5114rfzll2xpsndKpNOA6RdIkjm9d1LXu9tJj8WwKyzRr8n7jlLgAushKzCADMDrMGQ0g6hLGzVbdGn+11v/PG8W3sNG9YIQICZjVtgFIDhf7L2Y7K6uloRgGMnxXd797MFU1eubd4nmWwGiFwQ/n0Kb87UL7zdRMystYLWFkCapGQQSe9XuMN4QOtn7NsEDAIxMxS0tmzbRu9uJXOGDe5/+YzXbnrGVcYaMArA8D8QtYAal5nDO+x9xpXzFy+/eF2zloBSRCBGoanvG/Md7PytFgCBNTNpMCxhSZSFNTIOozlNnuQL1kQkCq0JygsjcIcWBoGZmRQgrKKQhUEVpU+dMOGXF15yybFLTWzAKADDfwQTQAKAmnjS9bvP/HD2/cvWJLd3nSRDkAZItjftuTCwn3+s5/n3yrMGhAwGJLoXh+sH9uvzzN67Dp82b97Crb76fslZy1fV71WfdMFKA0J4bkV+FKCtZcD5ioazikJDKxbClr1Ki5aO3naLc//+yk3PaAbF43FKmCQiowAM6ycb6LMk8T6/vPC8z75acNPahqQNwS4IVrs9lLn9HfR9dwIxgzS0kgBQHAmgokfP2iED+/7pnN+Nf/pXR++xRPvPFwraOOn0m/b54PPvTl24dOVv6hpTYdfRgCCXBASYRYG8rzfGkH2QXDBbxeEQthnU545P37n3IiJysy6NudNGARg6Fn7NzPb2e51633eL1p3S0tLCJJiZvBP9dhLIbfx0ZpBnjyso1yI7hG4lIfTrUfLa6GFDpj/x8OUvE1HGjzDIeHw419bWUnVe6vD1NzyzzctvvXPa94tXHrdmXapPKpUCiBQJQQAE5x8btnMxgNx5ArFmrdm2Q3Jgz9KaiyYdetwZF05Y4tcWuOaOGwVg8MnujC+88H7vC6/+Y9X8pWv3cVXGJSEktPZC6ZQr4W0VPM67iQTPD2dtWQEb3Ytk84CKnlX7R3e9786bT/s44/gbbzRq8cyZitpE6POLhwjARx9/3fOKa/54Qu33i09a3eAOa2lJA8Re/IF1LqOQOG/fp7w4hKeMwBouIKz+PYvnHz5up1/df//FX0SjUavGKAGjAAytwv/7SfE+z38872/L1jSNZJ12QGTnjt+ysfeOjuYAZrCCUlYgGETvnuWrB/TuNj12yD5/vGjKUd/7VX0iFovldvoftkRqCajOVhEGf31M/PjZ3y06e+nK+lHNzS2eRSAtL8OQueApiSgvXJBTVi6Utvr37t544D47HvHIAxe9FY3GrZqahFECRgEYs/+cc+7o/eRrH7y5uq55JKBcEmS1N7XzfX7ybQCtoFjawQB6l4VXDt2y/wOXnH/cgwcdNGap/8syHo/zfxN8Y2aica3pxsxsx46+4nefz5k3ZfHq5PBkMgMIKBAkuE0Qst1pBEBEil0te3QvS+61y7DDXngi/nejBIwC2JylXyCR0NOnP9n7yttffXP5muaRxBmXwVYH4phvZ4MAzcqFsIKiR3Ggcast+txz4wWn37XvoSOX5/v3GyjqTrFYTGSDd8wcPPCwiyd+NW/xH1bUtWzpZjJMUjAYggtiFB0pAWh2tejZvSR5+L477//QtIvfN4FBowA2Q7yjPmaWW+100oz5S9fuwew6RGS32/kLzt4JICgoV5YUhbHlgIqnYr+MXnXVVcfN8R18i7m9f7+h1kq+InjnnS+6nX/l/VfOXbTi3LqGtADgEsHiDoKDre+HPUtAQVaUh5ec+Ju99po69fz5WWVo1oVRAJsJUUuKt91tdz7p0W8X1R2v3LQDsO3JTFtz35MdL1VHayEs2bdX8YIxo7Y5/5Xqa55zVacLfrs1E41GZU1NjSsIOO7Um3Z/75PZdy5aVr9zJp3SJCVx65tAR8VIBLjMbA2q6P7xglmP70E0QQM/HJ8wbHhMA8iNLvteht+uB5x/xvdL1h2vnLQLwM4L8+ckHuw17CAws1YcDgbl8K16P/P4DZVjX3zqmudcBek18axxaePl3bMXwWfSHLX+PO3i97/7+JG9dti237UlJWEvl5CgC44HC6oLGQxYIOEurVdjR+1+xh2CqlU0GjU9CI0C2Az8/poad9Kk67arnbv49nQqpYhIFvjN7Wv1NbOmsuIA7Tx6qynffPxwbN/Dt1vtN+1UP112HTFQ48ZiMUlEmY9m3n9ldJdhv67oWdLIigX5vQj9uEGeNSAAEEgIy3Wa3O+XLP/9PgddOL6mpsaFaURqXICuTUwyV/GAEcfMXLKqeW8SWjHnp/YWnvF7ufssupWEGg7cbeSkqv+79nkAkpk1/bwq7XIViyeccOOoN/756ctL1zQNApECIPMXGxdYBVqz0tSrvGjR9EsnjjzilCOa8y6EwVgAXc30r1Zj9j/7+NUNmb3BrsvMEtB54uEX5DKy3XhEeUlwzW7bbbl/1f9d+zzGjLEBKPr5ldkyUONGo3HrkUcu/fLyUw/df6v+FQvBQhZYAnmKjlkDDAEh1NrGlkFX/vHZPxCgYVwBowC6HkyoqVGvvPLP0kVL116TTmc0iey1p4JNz6/gZVYKPcpD6f13HTb+1Vfv+HjMmMk2PvnE+Tm/y5qahBuNxq2zLjz+u1N+td/+fXqULGUNSSBdaHJyLhpAxFIprRevTp913vmP9EdNjYIZTrLRMNp2o+z+My0sWKC/XVF03oKl645U2vVM43a9OsizjZXWxUVhecBuw4579qkb3xgzZrL9ySfTNrzwMxMSiQ36lAsW1OhoNG499Oh5qyccOfH9BctWHZtsSUmvlqDtLEICQEQkVEbZobqmOrFmycevYSYksMAcC5oYQNe5xszzghXbXfzNqrXJgSSYmSE8U5/zQoAMZihb2nLHYf3v+mjm/ecyj7GBn/fO3xFZpTX+iAsnzfh03iMtLUlFQkjOnXBkFZ5/xKkJPUrtdZUnH7H12ZdPWuPnSphYgHEBNnnfXwLgPQ667dDGFncQoHXuuud6cOYSfjQ0iwG9S7/+4K37LmaGBD7plFTZmx/joivvzUQ95bThpwR/8sk0B9Go9fpLtz86uG/ZX0lIiWw8oKC6KXvoqVRDS6r84ZdrDvOu2zhjnRoF0AWoqdFCEJYsrz8+lfGS5vOLZcg75feKaJTikpIQ7Tl25DlElI7FYq0O8waz+j1hX7ACFasa6aTOfOvxceO0qzQdPX7PC7uXh9OstV8/mJcnBK+9IMDkuMwr61t+IwQBNRVm9zcKYFOHCYCeOvXRinXNyf2gHSKv20++0Z+VBEXClgN7l7/x9KOX/w3onBz5Sl/67IDTmwTtzcyys04VEomERiwm4vFTvhncv9fjwg4LBqlW6W91fohIgAW1ZHivO+98todXjcjGRTUKYNMlFpsgAOD5GZ/slXZ0EcCqcEhHXvRfKSouCmLX0cOud1wNb/PvBCq9e67TYpRiMfi+59EPAOJx7pS1EEMMzKAD99npjvKigAutJXWoKolArJPpdPkzL83YOf/6GYwC2CSprl5JALBmTcPuGZcBEh007yYQkQaE6Fkamv3QtIvfBUCdVSE30/+4roXHNqYJX81RuwFMMztpLVRXT1AA6JbrJs/qURb4px/5UMgrdSDyDwiIdMbJYHXdqrH5189gFMCmGgDQUhCSLckdWLmeS1BgbHtWADO0HQqhb59ufyEi1ZnJMDUJKGYWzLQzAKQ1RTs72h6NRoXjavTrXfaCHZBgrb1YiJ/8lJ//rDUjrcRwQQBg4gBGAWzaaFdp2ZQWg/yWGW066FD2p0TIBg/Zsv+rABCr6JyFH4+zFY+DrnskMxqSRsNhQPF4Zg5UjAB3lhtQ4b+fwf37vxcOWkBBHCR/FgETCxv1zaq3bz8YBWAUwCaKH21/8smZ3aQQfcA6e+SdF9cnEEkGQ0Rst27yxOO+BoCqqiq94V4GU6yKZTTOViJBbiJBeu4icUEyI6Sb1plkRm557m3quOoJpBIJUDTOVqyK5YY8Ghw+fDgDwP47j14YsZEChCAS3JoVmG0kSgRXQQj0UZol/t1YI8MGwVzczr22HI1O7vnR98vmtqS5lKC9Kv+8mh8iaFZabNGv+6z5Xzwx2h/X1Sk737/mcXnVyzhv4SrEW5qVFgRoEIoiqB8yUE+sPMV6zYtHdM61YObgwBHHzFm8omEgWULnxpW3tg3T7CrRv3fJksWzq7byOxgTTHFQp2GZS9A5+IMweOCobUo+mb80BK3AIpv+n6v2g1fwLxAMR9YGA5J9q2wDLHimqirY3zQleyfT4Z3W1uvxtz6kDrECsr+b0SwFCc2AJEBr0X3BcvHXiZX6y1NuUK/37a5f6dvTmv3Z6k/qpp02dkNkIWbfT0badj3AA8Eqz//PZgRpgAiu65o0YOMCbNrkMuxTQGulnycL2f4YnP2KACeVqldeC9//ySpjZmJmeu29dd2+XKOv+H5h8B8rG/C8EuLUjCv7N9S7jlb+SyCABMHNaN3QoNxkRoxyIabUNVlvffGNfrdXeodLZs3iYmYm/O8uAQUDkpWjmyBkB1ZOfickY5gaC6CLaIDvV65MKw0HggIMjey+77kBIucDa+VuEDM3L6ln7YwZfPUHEtNWrXO3J7KiFNGHNsAalkoptmyQJAGtNVwtRSQCUSTVl2FBz5cG9DvFZdbs8h0+WTVq5FhnQ9nfggQkse0LeWHbMPKbhZAZI2gUQBciFLSJcoudcjtca//8bH9/3uCrft99yQWw2P/3V2a+4pwb1Dl1gqamM8zaN7ntgG7sUyrOvWWKfIKIOqtNN5PwOgEha35wR6ECgU64FAbjAvw0lAVKCaxFawGM8Pc99mb4dTCCe4NKXd4pABHcuy+3bqnopq8PhqVwXHbtkBBb9Oczb72IHiWC7oxTgI7jAXmmfn4vxE68FgZjAWx0tO100CEXuSk/nb3X+S6BAoA4s6idwHLriqa7F60KnSsDVokF95ubzrT+78NVbM2shMpaAJ0ggsTMzGDt7f6eAuxo0jCR2ZeMBbCpE/c+SBESlHP8/UVeYOJym4+dGJYg0tXDwWceX7JSCv6gtDvQvRuqiEiPK4wfdKZKytv1O7AN2LQENAqgK+AHAaWjWrc61q3Cn5vx5618zRtn1UcBwWAqK+X3AzZQHOY3AaB2xMb5+60TDamN/uMCK8BgFECXIJNxmDva4bkwCCY2kttbMcILPhQViU/TSaWLKuzZAFAVg+582ScIEm2if9zGPSITAzAKoKuRF9xqWwzkBwK05yB3OsNn+80HhJ4vBH9x2a+xFhvN/G/tAVJwXZiyjdOQXyVoMApgk6dRk2Zwa7ifqI0D7NnCIu9kvFM9k4T3hwPsruwWwctE1GlFQOtRAdwuHpBv9hNMItBGxJwCdDKBgEOUS/zPs3Y5+z3BXivAjWMBZEt/t949siqwHPfmK4VO/8veRi+zgk7c2h6wvbVkMAqgq5B/1p9f60PUav8KP11oI63/08aSA2B5vlLYGOg8Q6C9NwTTBcy4AF0Lt9Hb3Ne3u1FW+HjjJ8B1YrLPeo1/Qn6wkQrNgw4mCRuMAuhCVgC1k3LOk8aN/pJ+8hFjXCjrRv6NAuhq6KDtVbpw/k6Xt9p5M1vxbfMdCuKhMEcARgF0LbwgYP5+zx1bBj8Dqpil16SjE10DQseXoyNLwGAUwKZO0LWow3OttubuT3n05ccCvrg/vfUf7nXOAohjVbxxJvPkeoJwQazAYBRAl7J7C1d7vh/+07+6eKX3ouqbdM/Fq+iqqhkriqsnkMaGDRKSNxZ8feJtUoCNAuiCpC03t7KpA6XAPw+bVwBAMGT3jpRaPT78rMdRADheueGnRxf0RS+wgihPKRofwCiAruIC2FZu22897+tg9/sJN7+ZvhtQ18CjGprAaxpxIhGQwIatD2Cv7R/neqP5nxTIOxs7wCiArkC7cuA8N6Cj466fcNOrqQWDiJNJ7NTcDJ1xMObWx5NbIUG6U9KEuQMrKL9K0gQBjALY5PHLgVvSSrE/FCC76Cnftc7WCv4EeQBgplicA9HhoFue5B1DYfvw8hLI4m6yaN7ywAkbemQYEYFE4TkotQuGGPN/Y2JSgTuZTKbBT3ptPfDmXBJ8q1UgNrIuZmYiIq4GMgBw4Tu8JmTjWHLdtIhYlki7XwFBHgfWNRt06+8gEYrz1YE2KsAogK4GredbrQ1BmDZiWq4v/MwzrHNvH3eZ66D4r++p5dpBmkElREgFgtT3xY957uFjqcWvV+ANpQLW6+Vnm6QYDWAUQFchlXY8p3Z9ue4bee5NPM4ClQAeTg099zbrhYzEti0uEA5JWEEgkwFcDWiy8cGn7pcA3opVQVRPgPrf9Q7gDUdqowuI2+QeGQ1gFEAXobQkIogEoaOdL78tOHduXn48ziKRACe82ARfdpc1NpmRL+uMs85NgtY1ApGQ5xq4rrCEbcl0UK8FWpuI/K/y78UARKGzn1ca7f1v8gGMAuhSMQCbc80uqQM3gPOko1OFn7T0upIzM3DDOXgcwOM/5vcTiQ04L7BtKjDaZAAy/RR1UUYBGDY0lQwksK5htdaA1wo7d6zeuuPBHxBCrDptJHgiQe7ZUzmaUfo2S0Cy1iKVgcgoiFAACAUJjsNIpr3fkZJVWbkti0L6metOk1fFqlhWTyC1QV6QztN8bd2fXLaEcQGMAtj0FQAB4G7BMiIQtRX+Nntfp1gA/s7vXnpP8pcr6lDV2CJKoAApBYgApYGMAzQmAa29f0IAUgCZemAdq1EAsHL2BpTItt1PsxOCqLVJChkFYBRA10IXbGxZ55cLbeENhBexj8VYVlZCR7ZwT/l+lZxOAigNA6m0N5woFPCE3VGA63ovQcjW4/hQEaAyndApmDk3HTXn8+c1RvIsAzMc2CiALuICLF23SrPWGgWurzcbsHUIBm2QRKCsrw8A1dWkiIDbH+dve5Zgf+1AhUKuaGry7nrIAizLE/5MGmT5X6dcIOOAK3pZRLa9DABqKqFaxx3/D96/lwzcavWgbfIP566PwSiALkEyZflbHhWYvOyfDGYHhP4vaUBeUo8XrGNmGbA9fz3jcEAQvc3w0/moNRZJedO4dXtJLbRJNkznIC5ogtJ2JmLO/zepwEYBdCG6lwuxbIkfBqC8I2/O6wJGBCah/2vhrwQBpM++WV03eSpiE690W4SAPPkaVXrytS4TIUXgEECSGRkChGa2/eHASgMp9sIQUgrWGsSKpOxZmr70lrNDz27QICAJKsyJaK8mDEYBdAUXwA8C2kTZaTielG3A+XdeRh8BPPladde6lDi7pRkASy/sqDvuN8B+wC9rkAjROpZPCE82LQso6hecC2ywPIDWGEBHQwGzVgGRGQ5qFEDXiQG0FJi/nBP+VjPbD4X9x6nATPE4qPfOXP7NbPWnJohfO34yj6s8AQ8GfBNf56aSe144503k9hUC+8rAVUAoBJQE1EfXnGR9hry4woaBOt71Kd/5MDEAowC6COm0k+uA723+3CptOS1AEPyfHQPG46BEgvQ19zvbN6fFskzSvcEWOmy5Aq4LB6yJWEhBWkoAkmGBWGqQkgJk2xQiAnmhCB3wX6RSGghFbLs4xI9qBmK1oOoNeUGyhVAiTwMZ4TcKoKsSVDZRgX9LgMgzgrMuwQ+cAjAzTaiGQKs0cizG8sozaCb8nh6dQXX1BvL9syHItuZHgVXgW0MmCGgUQFeJAYS62eTvd369S2sFYL4gMK//zD0eZ0FEGoDaWK8+vsFN/zyF9+9dG88nMRgF0BUIBOzc/A2Cn4wP7TUFYQ1mDRI2YPk1A4gBedt81E/lnf5kY++P5hXf2JJEb7CCbRMxGEq1ylUg4H2ulKdbpAQADSkFAhYAgnIUkkpzOplCfTqNDAMuAEgCwgHoUJFlRUJ4JXEOvbWBlQDnmqIW+PxtgwHYmJPKjAIwl2AjwK0H8J55S7k0GAKYtaO0q/wwXaHw1yTIjT+QGTujVlS5jMFSACQkMgxo5RsQwpMZJ9Ma5Gv1MWTHE7gYELYXHBR+4/IMA5QGtuiGP3X+Rfl3loA5BTAKoIuQyTjMIAZx61Cc3AdSgJBSQERCELk4GDOhElSTIPfiO52j5i+3HkqlUcLadbQQXhIh/AweAoT0dlWtvScWBGJmKAZk9tgdAGvKJdmx9n1tIv/oj1xYIlgU1Ddeeqr8KlbFMjGB1MaRfC54hIRRABsLc6U7LwbAANC4sl4x+f69X3FDxAxmBWHLstKS9MhtB9+1b3T7KZpB8XicQcR0Nelzb3WvWrHOqm5JoQSsIaVlkxAWQ1jMwmKSFglpMQtLMyxmsrSGdBWE0iQIJDRDaE1CgwQIUjNLrVkyQZIQkghSAySkCBQF9ao9x4pbEWexQc/+O5T29XUFEjAnAcYC6DoURfw9OZsApBU7rowUl8j+vXu8uPeYoX94+IGLZn3+jhfpr6wEnn/3rJK33i+/q6FFnuCm3CZbgKQFEkITgbzxXUS+6c7enimlgLehk28Y5GoQszE19uMD2vfGLb/4J5WGDEaAsiKeOulAWpMtIe6U65Hf8i/XIyEvRZjNUaBRAF3DAiAA3K+izJ7NWnpn39IlCLtXaWDNmNFDLnjzpdsem/ORBhC1wDOVHy3kql+w27MUtxWX4vKIzggAcOwIh3WLiIQitghBSidNyg4yUinYEbJIqpDUAXbhBLSyyXEcOA7gAEgmbTgO4DoOWhzAcQE4gG17KyBIECEb9p4H2h/cyUwJ6iThB/ISnqjjBimmI5BRAF3HBUhg6cp1DpNwoZW2g0F7iz7d3jz5qP1PveyyY+ZjzGQ7dug5tBIjNCohEfcW/oTXkUaCvtzYr/ieSzr3+YkAQUTIC0TmHuA8LWDyAIwC6CoWQEXPcqm1plA4LIYOqrjrs3fvOY+IeHgsHqitTmSqP5n2s3i1G7Tg54dVgSf9WcHnNru/8QCMAtjUiceBRAIQWoTLwygaMrgi/sGb915NdK+IxWfZ1YmRmSse5FGLVuG3bkZraYPgd+QBWrvziJzr7P8nAEt4j2ntfwMaQnh5AIIACUBYrc9jWXm/w3BJc1pKpNOOAJOM9OuBx8+fQPOzswI6VfDFjxgAYiwAowA2dRIJzwWoX7k6vd2WWx/z9hu3P8WAnPwgi2mnUeb2PzvjvlqCZzMK3TULsPJlQqG1OC4vRpaLlynAyVbyQUAzABaebGUKTWutW2NqRK1Zx8RekpCwgUxKrendTT6wgScBr0+yoVVeV3AueCivUYExAYwC2OTxdtJ33rhtEYCnAIjJk1lMO42cyQln/4+/Ey8phbBydEZrFi5am4Mw07+XhdY2Au03zdw5f1vZYpDwUg2UZjBIlZUKa8vePHHKcbQ6ZrOkTnYBODcEkAs8gcI3JSGsgFk+RgH8VDAhOk5GAVRUVHBVVZX+n83iWEyO6XaJmDaNnLNu5IOX1em/OC6FJFwtpQwQkZ+Y48/Po8KuufmxsrYCRfmNhrhN93H/E5HXg48ACAEFEkGweveGM+1XY7GN4/+Td3TZegrA+QEAArEGoDWRVP+jpqF4ZSXNnDlT1NQAiFUwqquVWdtGAfy4nbsGbk3eovWRsVgM1f/FQorFqlA9gZyr7nWP/mYJ/swatk1aMwvBmgt26Vy7IK9UoHWSdlZoqM2OyZ7CYF+YWmv7W+dueJXHBO0X4wkhYQXAFb30FcxoW37QuVcXgrJxC78vAjORBhNrZgEnLZTTVP5fKW6Mk0CNBpFOeJfBs4Oq29sbBqMAOlhAhJtvfrbXX996fwq7LbVb9O1Xe8ABO8+ffOqhKzMZR1VX/+dSkt1dr7o/feqiVXJaOq2YNWv/MEyzhj85jAp9YyoYmuMPGOecbmjVAeyVFzP7DXfJN7IZAuQlCvmZQcQMBqtwRAQiIfX8zWcGajbW7u9tzBqapCISDHYVmJk1JMiRwVARiopKURoU8wf0Dr/pCS//B4MCiQG4AVsinXGLp0y5f8tv588fvmL1ul1si7587+8PPHpVPC4SiYQpNSxQyAZfUGPy2Weq1Y57nzZ99verTmHOIBgIIRwUDQGJ+aXFxd9uvdXAGS8/fc19SusftZvEYiyrq0ld/5A7afEa+UjdWg0pGQQJIVsDdVkTXmsvU49R2LQzG8DLBtFJ+HN0udCFZuS1AaPC5p+u2/q8kRAwZAB2vOJEfB5nUII2Th/uUNBGj21/+8GSJat3gUWIREpQGqaGXkXyg/79+r06auTQd2667uRZUlBK/8i9Oh6Pi8rKSr7ymj9uN/Odz89ZubpuaIsrh7a0tPRLpVNIO4QeZRH3jGMOGppInDwvHo+TUQJGAbQT/urqajXp5Ov2fP7vn7yzrrHZgZQCIAkNgptCuCiCnUdvc947r912Jx8Vkz/Op/R69E99IrVNaSgYkSpDAKCJLAICgkCO4wrXF1DHAZqavPrc7NeuCwQsCkQiVCQkBQUhICUicLXVkpZocry90nEAEGzWWtoBBAMWFUlLRCQQdhnUkgKUo9kOBUgpZ/79lwWmbsipvz+GcCiA/sNi39c1JPsP6Ffx+lYD+j990q8PnXnkcWOXOE7B5cz6CIjHWYwYAZoQg+64O7FnJdx008O9b5/+wnfL1jpFkDagUwBBQQRdEoHgyMEVz9d+cN+vjzzyKFlt4gFGARReg5hgrsKQHSd9+P3SdTsRuYrB0stVES60EoP7Ff9zce1ze2YcN7c4Ow4+QQLATMxExYhxDAAbL8HmP3Z5NqpPzMxi4slTJ2y55cBPpl79uzmOm/vzIhqNioqKM3n48BgDM8VMjEPNj6xHiEajVk1Njbv/4Rcd994Xix9PJZsdQNkMbwISK1YlRUF5yB5DD3n6yetfzSp8s/SNAsjt/uMOnnLmP2fNvyeVSroQZEErEDFYkyovK8OEX+6y27R7L/j4p1k83GHWPKIQY4aCturrf10LzG7zg5nGObT1Ntsg2TCfwqVbcrI7VMUI8M9AKYlYrIqGD5/NQCUAiEQCOn8skCWBR17gLeYsdsf0HmDN+P141PsBzg4UV1wwV/I2O5/y4XcLV40luIpJSi/QqDU7GRrUu+SbBbV/GU00QQPV2gQFN/MgYNwLCvH06S/0/sMtT12dSrZokiRyqSpaK2lH5JD+Pe6fft/6hT87mOP115dH3l7Y63g3Bac5xWtTLlRAAiURoKTEy9ALSkAQHEejJe1a9euS6WRJIIiSYBolJUBpEAiHgzpchhY3iWRDemUGwUVqtwHAwIEAMDAb/lPBADmf1gCf/MD7/O61n5PCrZJ5Qk+JREz7logGgFdrmvq+83XRHs1NiDqO2v2ND93ttGUVL1njXodD7SsmVLFEB63RYrFaIiJ9zImJKStWrpzZ2KwASzJ5ylNACnfFOne7cQdPOQuovj1rNRgLYHMmGrXE2zXuyN0mPzxr3soTWDsuiCwvC09rdlLo17tszaPX/37YgUceWMeepLfbNbKdeybFnUccaU2C8tJuM45fdmt5X1Ne+3utAeUCrFWuN7+gXF9+rTWnWFNKMzIAaykIQjIsQZCCNGt2NHPSUWjQmtJSem29ssM9SQABCxASKaXQ7GrZHAnq5L5jGy89dO/yOi/baOP33opVsayuBuA3GxUAHvhratt5C6wD6+tpfH0j9tBClEnLuz7ptAYBbrcypHcYmhl1zoTQ/GxH5A6eXUrxjBq+84lPz15QP4HZdQFt+eFRZi25ome3xutOO2roqef9aiUQJ2DzDghuthaAv5u7x5xy424vvfnxCdpNK5JCeq26CMyaQ5GgHDlk0B8OPPLANbFYTFIH0XK/iMY9e6p73NK1cpLr6LSUkFozZaPu6Vy3W1/rEgGaiQSJXIvgbDEMExgQQlCEBCL5ST063Wq0kvCr6/yOXxknr9donloXwjtJCBUD6RZ+b/yysoZYjGU1bTwXgJlpXCVkTYLcrOvx/Lvc75NZ6tAVa+nomvewF9kikMn4wUwoJTLEYAjhzU2mjJJFX35j305ER9TWsujYohvOiQTTSUcceMn1j/710FVr1oVI6OzpKEGQWr0uWXbHky/dIAgn/eaoWlFdjc2azdgCiEnmKmy1/e8+mLe0fgx5KTneCD2CYia5db/Sj+f868ldiSYQ0N7095pmgm99BP3en61mpZUstYQicOvWWtD+P3u+36YnTmF/TAaBuDULMH92NvuNRdE6WsxrL5Q3cZgLjv/8LEAViAhrQC/38Kln2n/NWiwbU/ABr/9AYrpz0KLl4oTmFhwMKcqTacDNeK1KSBCIIcDeKDX2hxVIASjNSthSDu7j/uKWc+031le9GI3GrZqahLvnL86v/HDWwriTaXFB3kZHQoJdpUrCUhy8++g9qqqu/ydiP/ZEp2uyWbYEi8ViEqhWex983uSla5JjQKwYJAAGMTMrjfKSiD5g793OJiIdi3X8PDMxUwginr1ATdNClguhOFfulk3JZT8xR+fkuzDyxK2NcJizQuwN7NB+GQ8RCSISAAkGCWZ4H73PJYEk/H8EIcEkwUICJDUTQYgAu2pF7AhrBgDUJKA6W/BjVSyJiGsS5L7zRX23S+7kM0+6mj/+ap71+poGcUxLWpQ3NSmlMkqBNRMLKZgkkSASvvBz3rgQz5Lh+ga6iXn9LctqaioVAPHua7fd1KdcLoRSkgBNIC+WKgUaWxR9+u2S2wK2lZ8laBTAZhL6E9XV1fzgg0/0/Ob7ZYl0Kq1JUF7GrdbSCsghAysemXbPuf/EegJ/3i66r3vuLe7vHZaHwFWuAMnc02QT76lNw0vfBciriSuofs19za0/6wsVcrU0yB8smq2ip1w2ILJNQxlgzVraQFGYXxrbn1qiUbY67/iPKRqfYRERV08gVTWD+0y5zb3yj38p+WLBStxT14AxLS1aK8cXepBkJpltW8ptBoMQWtupC5CEVloLuf2Uu5xTEgnSMS8g2Nao5VgsRkTUMnrYlpcUFUeINRjkGRZetRHUkrUtu+998JTjgGoVi8WEUQCbzfZfS0TQd/zprevXNqR7QWhmZm/3JzArTb3KrLqzJh38B80Q8eHDuaNIdk2C3BsfSY9YXU+3trRAMUGyZrDW/9bX4rzW4B1vPX4xEBGydTOtApH3JAUaA4Dm1opeppz4ZBMDu5erFwFQxZmdc/TlCSNxTWJf9y9/W9fjgjtU4sW/6y+W1surm5NiQCrtKuUqTUSCmaTWoHzF15r5SAW+kfBNAK0BaBZ19YqXLBc3/OkV7lU9GxyPt48HeAo7Jt94/ranBvXrMxNWkQSRItYAaxCBks1NPPurr295+OHnyqurq7mDo1ajALqg7S9RXa2OPi6x6+KVdacoN6NA8M+KGaxZhcIhMWLIoGtOPPHQ5dFotH3uODNVD48xM4tv5suH064Iaa3A2i+5yfr4zNl6F28nF3mPUZ6BIACRLZGjrAPgWQ5M3KY3RrawnwsCDJx7iP00YP+jF2mUWuu6MTum3gfAVTFs0Kg3M1O2noB5VuDCW91znn+7+LMVdeKq5pTolWxWLlizJCEBEtzG3PHed6tVk62KzAVLCcysmT3NymA40pbdZ3/tXoQE6drajs33WAxwXBcHRMde0K00xOxq78V6tpEgIdSqBrfPndNfuZQAjdgEYRRAVw94VnvZaO/+q/bOxuYMkRTIG9SnQZbVv1fpl2/+9fb7gJisqZnZ/rx5AgQlSJ9xfebmtJY7p9Pa8Ux2dglwCaSIuP2oT87bnLPBPUJB6S/ltkLO64zVtlCIC2ZqrrdlgDeKXEubEAjwl0fvUb4WYLEhO/5k/fzqalLxB52DTrl22PtL1so7G5NiQKpZuQSXiWBl9/d84W7d+ckLegKamRUzu2B2/c8ZEMQkSVqWsGxL2LYMaA2sS1sXXXZfZu/qalLrswJisZi89+ZT/rVVn8hjgrRkVsr7+wIQJJXWesHKxnPOmvLgEFRXa8TjwiiArrv7C6Ba7bLfGaetrMvsClYuM8usgLFmLi8rQnSPsWcRUdoL/BUKSzzOorqa1G1/5qEOrAns6nWRkLBLi6UsKpaWDAiLhZCaJYGJidglYsVg7ZX9UpvyXiB/cnBO+PPPA6jVBci10qCcSLV20SYq6K3pDw7hYAgoifA/GUA0voHud96u/+Cfm/qecZ3zyNxF1uuNLWKndEq5YJdBZBEJ3w7x+5UTZa0jf0dnV7FWDCIWQkhbykBYWqEiaRUVSRkJSbKFShYH3bVhqb4sj+iPepWqDyx2nm9sxJ8bGzEKABLreZnDhw9nrUFnHH/I5b3Kg/XQLEgI9mMwRASub2gOv/q3d2+zpGAkajc7N2DzeMPxuEAigZtvfqznjdNe/mpNXVM5EVM2XEZgRQS5w3aDHv/s3ekTf/Obf5/uW1XFMhZD8JG/onTRcvTNpNODW9LW1k2NPKwlg+FK09aKZXdpIVeo4zguCyIlBARE1hTOiwP4/zG3Kohcnb//o7kGIG1OErJlw+QfA+ZVEKqSUiH7lOOoqWfTsxui8Wf+vMDL7nEnLFkpb0+66OemlRbe1RTszRyHP8IoezTJfoITWEspLUIg6CUvuRkFIXhJ0KY5JUU8Oxik2khALi4px6LuYawevGV944Fju9Ur5VdN/gc2TPZYcNz4iy5/78tF1zmpZhfElpccoMFKq+KisNxrx2EHvPbCDX/f3I4FN49EoNpaEgQ1/ekZN9U1Ot1JkMvMli9kzK6i3r0iDaf/7peXTX57uhjeQeAv6+8SARM8IWrx/y0H8K/sz0gC3nyLe771tTO0rkHskU5i74zknVLS6q8BSyvPFCZi1ws+kmjthM3tzPi2JwgFLnS2j0BBzkBeSF6Q1K5WRWFnFgD8r9N+sgNDPvuMix58zb1t8Wo5uSUFaKVcAizOWTi5bj++lAGAlJbt1Viy66ZtS3xRVIT3S8P8Qe9y+fkxv8D8fn2pmX/gBIe5EtEoxNChoLoDoKtjnj4gam+xAdljwYSY8fJNd2y548knLljaMoSgNZgFgwFJaGrJ4Itv597GzDv57tZm0zyky1sA2fz9QyZcsk/NB3NqmpuTiqSQeWO53WAwYO2945Apb750660/LkecKRqHHNoPFEzNEcA26L4W/PIy8CfT4LZdiCtWcPFd/+fssLpZHtTcosc7jtjJCgnPMki5DIImIuH3A2uVcs7vDeB9v0BPtEYO/WYfrSF1ItYkhAgE1bILT5Nbj+1PLf9LBWA2eei6+1PDv1lmP5FhsUMmpRV5SiwbxvOtEHhjjyGtQNjrSAyt1oSC9E5RmF/aoq8z86KJ4e9V23BkjGVsOGSf7t47W74W3K0f+JsnwTU12dyFf/v6OxTc7Bo49oRrf/XSzE+eb2xsUiQtya3KSgUCYbnDNv3P+nDm3fduTnUC1PXfX0wwV1G/4cd9vGx1w/YgpcBeyS4RNMOmIQO6zf7uk0fGEE1QQJVut8j8vPl/1XH5DuVolERK/4CwjF4Lia2BL9ZC5WfdWRKovD+9w8q18lfJDI5IZuQOGdeb7CtIuyAIAKLQxKfWc/2CByivwIBAeWufiDVLKQK2++kz19tjXJXrrsP/rfBfcY9zyKJV1mNNKfRQjutKISwSvpnPGpqhmAE7IGUgAMBVTUVF9LceZfzU7rvJtw4fS6vzLqr45dmwe3efT8F+W6ppp7VXnB1JNjOXzJwPOX8+UF8PAPXYYctyjNsBzUTk/JutQAYCz6khoybM/GreyihZAcUgCSIQs2al0aM8svayM44cNmXKcWuBODaHOoGu7QLEYgLV1WrHcWdNWd3kbA+wC5CVPTxn5XJpaVjsOXb0OUSU8XaKwkUYjbNVQ+Sed5u6855pmJhsdFf87iq3yZI0PxDQKy1B34UjPKesXC8dVJFZPPGgklVE5NZ4fT3yFvscextsg7vvRuaKyfQZgM+Y+erKB9zo0tWY1CLoCBayPJMGlOsqP/9PZCW2o8ag3Jox7LUQJ/hZtAxmMAnAsmi5qwDEIFD9n2cAZoX/glvcY+avoMeTaQitXCWEsNjPP4CAYiYKBIWUAghY+ovyYvHE0P5O1RnHhOdnn2vMZLb3GAGx/F241dWkXrsb6dxCFMDL73L3T+aiT91aDEin1ZC0I/u7rh4oBPeQFvo0JyFOvNrt77iwNYOlAJEoUV/O1rLqDcxm5n0rK6ETCXBbZRKLAdXVLvbffczFy+vff7+uIQUSxP5hqwCxW9+Y7jn9qTfjBJzNqJXGAtj0A388+ZwbBz790kez1jWlikgQeUfBXuAPgBy9TcUzsz54LKaOPKpd8CcbNEtMdw5bWme9WL/OkzbNrYU4VnaZaIC1qmfipVLSV6VhfFReIj8ZsTVqJ/6Clqq85ZgVhLvPRSa7UKc9ywM++1YdU9+AM5jkYMcFtFKKAMFEVHA2jtZTAaLCPTIbE2CtXRmSVnmR+/D0y+yT/pv8/+zvTLklc/GKJntqc4vW3gvxmpKx1lppRjBkiaANhAJ6Zs9ycf/1Z+JZ8ouNYjEONPYBvXY3pfNf6TP/4IpPP8foxmY1KuXSji0pjExneBAxugfDkpi9GYaaWyspiQDX8b9HrXkUmhkyQOhZrM695yLrrmh8hlWT2NdtHxCMWu+8XePuuN+5D332zYoTtdOkWGvpn7kylObSkiJ9+H677/j4QxfN2hwCgl3XAkjUkhCk33i79vaGZqcE0IoZguC5rKyJ+vQqX3f65KPOO+O9Ryk+fDgn2ka7J5C65f9aBn4xhx5KpaHYVUzeGZJWSmuXidN+0h5rWIAolxaVS4nhdYzfNCSBeUtU03FxZ3ZpiXintEzM3G0IPjh8X1r9SZ4y6BWEmPwbWgzg5nff5Qf+8k91Ql0jznZZbtPSArBSLhFJb1xAfipwof4uODWAVw6cSmPJf3P5Jk9me1qCnAtvzVyyuM6+MdmilBQQJAQRadaatWVLGZRAwNY1fXuJ66eeKd9gADecxfTLszn42t2Urq6mjP96Q1c8jJ3Wrlb7ZjLY7y+vqp2YZLmwJJTyqhm1C4A13CaliKCyJQEuZ09sCFJACvayCDWDoAUJAaSTwDrg6mdfb3zqN78oXpV/WpFl3Lhxuqamhi48ZvwVF97+xJHLljeUkMyeWYAgSDe0ZKx3Pv7sNkvKg9zNoFKwSyqAbNBnv0MvHP+PzxceyewqIpLMGkwK0KyDwbAcMbT/1WeccNiSaDRqJRIJt4Oovzz9evWgq2RPoQGyJCwJaECCBFzlNfHMhqa8tvaAUsp1M1BKgxhULB25qwZ2bWjGlKfm6zUnVqp3u5e7L+ywrfu3iYfQ4uzf++XZHNxrL2oEcPesWfzw9FecU1jLC12WA9JJ32phSO7QeCtMsslaBpHQf36P/Wi/c8Ht6ZPWNNk3ppPaFYIlIIi1VsKSsrQUUpL+pFe5uPGmc+QzSnsWw9BloGnTyHntbqSXLFkSue/5ir3qm6zDjk/og9OOGELSu4DKAbRWihkq67kIQaRdtjRLKQSksLwJRllrRwhPSQjh9VjQLiOZUmmtkQkH4ESKrMCn34fOAuiq2hHtk4MSiYSOxWLy2FMOWjru4HNuWrNm5XUZV7ve8HX45YJKraxLHrj3Ly86fMZfb3yxq1sBXdAFYAImiI8/viR48DFTZ62qT24J4XvErLzAn6toy37FX8/78tntiSZo5iqdn20Xj1dSIlHJVVUQ85szo4rCZGcyECsaHKSbbCaLygJBGrBspbZDNg1tSoqIbfHWmnmQ0tTbVbKMs515fbOVlXa9oCMFhCSEI4AlVCMk3isN4dnRw1qeP/mQ0lVZqyB7mvDEiw0936stOn9dI87PKBHOpF1F2ZK5vEGauaLhXHahdu2wtHoWuzfcc7F9efYI78ea/edMdQ5dXi9eUJpZMAnNDK3AVkiKoNRr+/YQV9907sx7ifZ1o3G2amrB2SYft/8fD5uzUE9sbMYEJjEEBKQzgJtRGoDjORAkwcKC8ITctr2yX+0CTkY1E7AyHKQFlhTzgwF3bTJN3/bqgVRDs54btJHp1wtUHODU6gbdMH+e2xIpbtR2sJiJSdx60S2rW5VZTvjZ+zpOiQTAXBnaatRRtfOWNg4i22Z4b9MzQZSmPj2K5y577aZRNHhwBl14ZnmXUwDZI5wRu5+S+Hr+6quUm3GJyGIv2gtWSpeUFouD9h51yLOPxV/H8JiF2urMBlE9/KD9xxcnd1+43NmyYZ0YlnZpGGuMbk7xiFRKDrQsb5Gn04CrlCskSWELEhIIB9SKHt356e7l+tErJwY/ZQCIsoUaT2ivfpBHzVum7kg6cr90UgOsNQkh2oXJcwpBu4GwZfXt5t5wxwU/TgFkzeYbH+Vh3yzQ769r4lIwWBLYDkhp20DAwhMjBiQvP29SZGEsxrIaAKpJMTNdeKc7vqlZnNac4l8olrbrAMTKhSCXNVtM0sp2PgIAwcoJWJhn2fRVJIDZpcXi6/IIvi4ra1l24E4frh48eN9UpyyS4bEAaqudXx19xTFvfvT9E82NjYpIydYmDFrZdliO3Lrfpf96+96pXflYsEspgGyPv4ln3rLNC69+9FlDY1OABIRfAwLfr5Sjt+nzx8//8dCp2V78oVAALcm0AMBff726uPbjWWVzliwGkkAyHBTbDOhPA3t0yxT1GrZ6zBhwJBx2M5k0iAiu+uGTohkzVhS/9VW3oWvrxc6sac+WlN6tMWVtDX/6r1YKwpIoKgZcpTUYf6so1w/cep71AhGxZxGQIwVwxg3uhWvW4dqMK0PKUS4JsnI2gJ9u69fNuKFiy+pVpm+46wL5gwqAmWnCBIjf/x7hh2eoDxwth6uMUkqD7aC0iiJ6Wd8e4qxrT6e/tFop5DCzuOxuHL28Tl+QdsVYAEgnXWZGhkjYdkAIYXn9EAm6PmjhX1LgH8GA/nSLPtaXF0z8ZAHRWOeHrqGUnsHjKk0A5AevzoksXruq2xtvf8Tvzq7FsmVJDOhXbAVsi75fuDATifTiXbbuj9Gjt8beY4fw/n13X4kxcCOhAKfTTm7Wwna7nfZi7dylhzG7iuHlhxCBGYLLSyLrTvn1PsNvueWsFYjHCV1wnkAXswBi0pLPqn7Dj3lt0cqmX4BdxfDP/L1FzsVFIbX79kMemPP94sZQKDhs2aomq7SseJByU+F1DesQCoZLAgG73HFcYs0gQbAtC4BONzQ0riwtKWMRCDZm0pml5aXBZqnF3NLiomVFxcULe/Xu8f2v9t9tySknHVDnuM56lQPPmxe65C9bjl7brPbVLg4CsIsDWdycBJTr/00bKCnSH1X04JtvOtOq1twqdFffld5+fp18qCUtd0ollUsCEm1S2AjsBiPSkuxe9/g19hU/dAqQffzkhPNoY9o6XmWUI20SgbCQYalfH7qVOHXKMbQoG9wTBFx8p3v0ynV0USojxqTTAGs34wUrpbQtICAAy9KzAwHM7FEmXh85AB8e9ytasT5bWgqCZVl46sE3yp/+xwf969c2bbFqVX3ftJveKqP0FnXrUmWhoLVFJpUKZdx0UTgU6tHckkYq40BpBsEbhqQZSgqBoGUhGLQQsIkbm5uXhYJhNxgMJdNpd2H38kizLeXcHuWB3v/8fP4JaRcEEsI7zgEIcEmQNaRP0cNzP3/6JM1eExmjAH7mgb89DjrnN59+teiZVCqlSAjJKKydJwJIBrxTH9f1z5H8+yp8k0Drwgmb7M/Wsiw/Ed3vvskali1BEJCWhYDUsIhXh0ORxeEgvi4K2t9279bz81EjBn95502nf29JoVSbRHYC8EBVy6Cv5wcOXlmPo1IZRIXwzGdIIBQCwiH9t1491bVTTw+8nf29hQs5fN2j7l0NaeuUVItiP/c+7/CbXSsorYDI3P34NcFz/p0CyB53nn+r+9u1TfL/mppUBoBdXCKprFhPvXeKvFTpVhchPj2zy9Ll8vqkK/ZPZ4BM2s0IYQWKIvBLoNWnJRF+aUh/funCSfbnRO3/riUJjqut8867f8jnc77frq5+3chkJj2sqUUNTaWSW7ha9XK0Da+KV7UqU1e15jNp7XdTzd4nbj8yOftPWv7nlDtDtCwb2k1Da/bWQbYsnP32Klrp4qKQOGSvPcdWPXHJp10xINhFFAATQDSjakYkdsUDs1bXNQ8i0uy1+coLi3OuOF9Bg72CIA2/B1U2zTYvHthmQeXN3mVmrytXbnifJrDXEQgk/E6/AgHbRsCWmaKg9U1piD7qVtbtH8O32+r9P9533jdCkM6P3AsA1z/KwxYsVoc1NfHRDqydQIDSgBRKVfSgP40YLipPO5iWASwBUhfckjlzdYO4syUlJWul/TZhYGhlBSzZq0y9fP+l1mGIscwG6dr5/QDuG93U891Pw7WOojLHhYhEwAN68mk3nWP9KRbnQHWCMh8v4chDj+r4uha+wNXSch2l7ICUzEDA0nO7l+jqfhX87BUnBz523PYmvOvqyDETrx719dxluzamkrs1p5wdW1KZrR1HWxlXQ0N7upZVdjKq8jqfZesotWe4ZwuMiNqkNlKuy0jbxKm8QspsuRSDBUDs14Qjb1oxZ49UFSggt+hT/s7S2Y/v47hHdjkrgLrI9i+pulqN3OPUG2vnr75EuRk3/4izYMhm/qpAG9lu/828S5T3edv52zm9wCAvPY+Zs2fQTADJ7DlW0LYRDNhuSSQ4q1tR4M2BFd3feOXFqe9ZkprzPQbmuLj8viui6xrEpHWNfGRay5JwBIDSS0rDfOV9l1oPs5/bf82DzkHzVtKzdetkMWuliEiCWNkhKYOWeu3xhHXwUUd5cwrXt/ufdr36U1NKnOS4isNhaulRIn5923n0t6zJH7+Pd5u/Qk1LZuSodJpRVEQIWhoBib9HwuKhi4/FC337UnP+c9uWwC23vjzg+bdq9lm2bO0h9Q2NezSlMoPTGQXHzZ6bsi/xXk6zPzRVcOFWjoJa57aBz3wF739O+cVRP7TKud0nrWWXmlUoGJTbb933tx/MvP9pRKMWulBAcNNXAF7Gn540+brtnnvjo88bGlOSpGizgIAOLYEO7nv7b7QJr3d05bgjhVGgL7weviyyc3ql53EwQhajOGTP79mj5yujhg9+6qmHL3+3bdOOO55IbfPtQvvklqQ+JqmsQUoBvcrdJw/e1Tr38H29/PprpzXvVrsw9FzaEX1YKSUEEUkhwkH19aNxOdx7zsJioKzwX/kA7z53sX435QjRrUw3jNpCjT/vuMC70Shbb9eQe/ZU98L6ZrqmxRFhMBCQOlleLJ7auh/uu3ASfcwFOz3w2GMzek5/6tXxS5auOKquKb1PU0qVptMOWDnZUkjlXxhBDGIq7GTQvs0J/8DSza+a4vUu7Xwd0f658+oqcr+vAUBDKerZrWjep2/9ZeSgQZVpINFljgW7gAWQDfz99m+LVjQe0Br4o7xC+x8h0AWLL69vN1EH38/r7dXh6mq7CHMH9K0KgZXX+FdrAQgh7BAi4QC6FYU+7NOt7InD997+ucSNJy9y83KIX3utvvvLn0dOXlMvzizuJrdwU3ppz1J9/M3n2X8HgPhdqe2WNdivN6XFoHTKdZksSwq3btJ4a8ihe1Nd2+y4eJxFZSV44lX67ZQWe9m2bho5SB3yh5MC7wCAV/arpzW0iGOZABu6MRLEY9v2d+49f1Loq7anCIcddfl+385fddyahpbxzalMRcqLDALk7fBEEF4JdBuTjP6d4ZW3+7fVCe0Enjs02rJlUpTXjzG/0YrvPOS6NBWUXHo/o+xgkdxui15XfvmPB64Fuk5AcNNWAH5QZo/9f3/cJ9+ufDydalFE3C7w104W0ZErUCjk5C9Qpra70vqUh79jtNEVufTcggEBWbPWX3okNDNpaC0hBNmWhdKQaKjoXv7sbiOHPvjE45d+kMmbnvvyO9zt3c/U5KVr6AqHRXGZ5Vz2wJWBGwFg6h9TQ79ebP29rln0h2Y3EIQYNtjdMXFq8Is4s8iOAs/u/hff4Ry4usV6Q7Nu6F2a+dXUs8MzAeCGPyW3mrs8UO2Q2Mlt0ap7OR7fZktx4zlH0df5l+/VV9/rXnn7sxMWLV5+cn1j89jmNPygqqv8Y0nvGLbdkuM8Qevg+lKbnb3gvuX18Gx3TanwHlC+gsZ6N+5spybOL5r0FT0RMWvBZSXB5AmHHTDyzjvPWNBVjgU3YQXgBf6ee/i50tOue/SrlXWp3pCSARbr9+mpnUFA2Qa6raafF0Nj9qrqch068xdmdnFxQRGu/0WuNW8blVKogai1o5+vavzHtfaa55GEtFEWkuhRVvLy1lv0v23mqzfPyORF1x56rmXg+7PtS4S0ziwr0Y9NPVOcQER87bTMbl8tkm81pxDsVi5En+7p2A1nhJ6pqmLpNzPJ7f4nJvTbdkTs1bubO/7aU+1XACDxQGb3havlG1qK4gDUG/16yGvjk+mdXLCSgCtv/GO/v/zln6etbEidWteY6ZtJtwDsakjJBAhmTTmrh9ua6bmEm2zlYu76EBVIqN8NndbvC+S7c5yn1D3rwH86yvZiz2oH/862jlTp0Orj1j6NDHaJlbVV3/In582qOk7rrmEFbLoKwA/8Dd/1pNu+nr/sfK20yySt7M2jXGssYl+6vHka2R2HdVb0RW7BaO05sdmjQVZeRN9PFfcG9gi/B78Ca+XrIeFdSaVadzLmrC7RENI/kGBq9QKk38fX64/tGRw6t4t5Fip7LoIMUFHQRs/S4Bsjh2x1wxuv3DjTybMIHnyGt5uzyJ2WynCxZdvj77iAlk25zTlobRO9IEMyGJH66jsvlJXZZCBv94e+7H5nj2X19rsB7fxh2h8C1wPAZfc6R65tsp4VAl/3iLh/uOFs+y/Z4KQg4JZbn9nqzy/MPGfBouW/W5dUPZTrAJR3IUjkpqB41k87FZibg+K3Ac4Ksh8s9Xf43L3we4ARQEJkm4iCKb9leus9z04X0P6cBO9I15sP6j1P9viQGMwaQngDobwGxLkEbk+BcW4iiV/AoIqLwmL/Xcbu9cKzife6wrHgJqkA/Iw//dvjbxzx13f+9WljY6MUpAUTeadgmhmsfOH2NwFfN0hJEMJCwLYgScGWDGnJlFa0rqioiLWbXiFINEUiQUQiAdau25hOplZqrVMQGux668cO2cWhUKinJipubEhxqqXFssORioyjizJOOiRIl6VSDhQFkHEYml24rmrT0I41iLR3bKjJs17yIoDM2R1IsdICRFRcVISBPUufi47d7qppD140S3sdeTQAnHljZgoUju3T0z3rytMi7133YPrYefWBJ5LNzqtPXh04hOMskCAdi3knAufcql7WzHTvFGs8Azg17p5FIdxVUkw33HKWuJqI0kBcAAn94oszel419enzlqxYc87aZqdEeR1MXCKW4GxksbU00nsbxMzZlmCawCxbBxh6Am1ZNqSQsG2CBRfBkM3K1asj4ZAGqxWWkA2RohAFbJlKJ9MrlMo0FRcXsx2JwLYsCC/PC0o7cJWCk06ipbEJgF0cKon0VEoXN9Q1sCa7uyarR7KlMSCE6pZOM1zYyGQcaGgo1zO8cmOciDUgNIQEERNYC4A1U0gO7Nv9n8tnP7a7414hNvWmIZuoBRCTtvWsGjDs6L/PW9YcBViBnQBYA9KGbQlYlkTQshCydTIcDKwIBCKLS4oCy0MBzImEi5eVl5UvLSkKrikvLl65447bNu8/cvjqPtv3QTgUbHZdB0L4BgJruC63sz2Fr0yIhNf9igkZVwUA2K9WvxOZvWBBr9o5y0uSqczA1WvW9UmlGgc0tWS2bUrp/o7j9EulkxVJB4GMq5BxMtCOyk789KLkXncw4e+HlAumae+HuhUF04MHD7rl9fv+MLXXsF6NwIM2cJpz4/TUMEV0ejgYeOaCifTOpCvTtzU78uzqG2QxEaWzvv+UO3mIUur5A7eTex5yCDWcd1vm/GSLOK5HT3369acHPoaXQalCQRs773/uaXPmLbtydX1zfzedBCzpEpEEmPzJmwyv1YL25iEobwi6tEGCEbAkbDuIoHQQskV9wLaXh22aV1QcWRUJReaFQuG5/fr2WC1dtXCnnbZzd9lmwPIxB4xxI+Fgs+M4EEKAmaGU/tENQfPvj9YajqsJQOTN5z4MfTb3295ffbU0koTeYvXKNX3S6eYBDc3Otk1JZ0AmneybdjJ9WjJsOy7gKIZyMp5FKCQggulgUAT2GNX7dzNefeDJ9Y2MNwqgkwN/O+510sRZ3618TLtJhCOlCAdDTkmEFxWHI1/3KC+bVd6taHaf8l7f7brriAWTJu2/KhS0Mo6jfuwCalNKGu2gnXZN26OgHzwakgTYAQvJlBOZfveLvT+s/XbwkuXLh69Z2zCioSU5ojmZ2a4xqXplXEbKYWgnk90tFbwmnwJExFppaEg7WIQ+JXLO9kMHXfzaSzc/72rPGiAC/vS8c2Rxufuvo8eF5/1+qnqlpFjfduPv7TfjcQ4kEpS56J7UhW7anV3aUPRmpkJNIqErpp4VuMErb2YhiPTRv4vv9f6Xi25YvrZpr1SyGSC4BM4mO3mtvbUiQHp5DlIgErQRsCwUha36kqLw3OJQcHZFRfmXvcoqvtpyYPdFxxy229Kd9tp+dcbJQHUwJ+AH7gUB0R+5ZtvdH/1DCiMQsJFMZcLT7nqu3wefz9ly+ZqVQ9c2JYfXr6sfnUymt25MW31TmRRamurRvSS06sSzjht860XHt/ybs0qjADZo2I+9fhxPPDGjx50PPv1qUyq9rmf34k8HVvT6cJcxY/91zjkHL7Itkck/OmvzXgUQpWgUAMahoqKWsx2AE4lKzsUM/qfApGdFVlZWUm1tLa1cOZyAmaipyS1K3dFiCQYspFY45ZdNnbbNV3OXjF66sm7nxsaGsWub09u1pFJFzSnHDxEwAO2S9PpZwc1YxeEAhgzs99AjN5x54Y777lgPRC2gxq1ilhOI1BPvcLely9J9L5oQqgUzVVVDtHTPjDjhgOAXT7yS2WvhGrIum2jPBCbbwDSHmYt22fesa76dt+i8dS2KQHAFsdeHQzNDawtEEFIgErIRDkfS3SLyu/Lioo/69un90eBBfT7//bG/+nb7PbZYlU4761O6Xn1QNIooxqGiYgQPHz57A96LDu6/n+35H98bWyKVcYsrKx/d6vPar8YuW7F8l6aUtce2Ww198LmnLr53U7YCNs0YwIMvRo7YZe/Arrv0qM84uoMdIyqi0VYBTyQqufMGYv53iqx1Ea4kfwEqtElDCYUCeHz66wOeeu2tnRctXXPA6vrmfeoaGkY2NqeRUeSbpXDAgAyU2P16lczZe/ttTnnyscveBuIWkHB/4IVQLuQwZrJNn0xzjj1l6t7/+PCrB5esbh7mZBo1CbjMkICQEALhgI3ikHS7lURm9ywv/kf/vn1q9t1zp4/POGP8PCmI25c6RGU0ClRUnMnDh8/myspK3sCCvcFPl+LxVgVRUzMTQI3OtyAIQDAYwM23/LXH2WcfuAaGnwwBRK1YrErG43GxqQ949ObsxWQ0Gre8XbxQUzMzXX75tB0OOvSCKSN2PfXvvbY5Mhnodxij4nBGxa8c9D2Kywcf6ewZnXxpwJa5gCmYqfAs3v9+1qUCELAldo2eXFm+xW9c9DqC0Wt8ChXjGRUHc9GAQ7jvsKPXjt7ztOcOO/Lyybfc8sx24VCoo91DRqNxKxaLybZ/b1OHmSkej4toNNru3hh+ohuyObzPeDwuYrGYbLvogrbEPbdWbX3AYRdduN2up77bY5uj2ep7CKN0Tw70PohH7XL606u/XV0KeNNxOnzyqPecT05/s/ew3X//QqDvrxjl+zF6jefwwCO4z/BjV++w1+lP/fqYK3775ptf9LZk20uer3yxGU7X3TwnCht+QpctHo8LX3BzwbFQ0MKFl04fs8e+p90+cNivF4YGHM7oP5EH7Xjqp9df/9jWnqy33bXG2AAw8aQrd+83/Li5qDiKZf+juMeQI5yhY47/22Gxq05+880vekvRfoePb4ZDNA2Gn6V14CuDXNXD2rlcdviEyhO33vmMt0sHT+CeWxzc/Nvf/WG/PEuAEI1aBOCAIy87tnyrCRzoPZ4HDDtq4e4HnD/1svhjI4OBgpb4siua9AZD11MGeW5CKGjjxFOvPXirkUe9vuXIY5xd9zr9t/k/P3avE2/sM2wSD9r+1I8PPeryUxZ8Ud8tP7YSjUYtI/QGwybol3oxA88qsG2BQ468ZJ+xe5z62rGTKs+85JIHy/ba9/e3b7fDsf88PHbl+Eg4WODTG/PeYOgi+IpAAF7nrCmXPvDLW+565uhjT5x6aH5ALxqNWjC7vcHQpRVBWwHPWgoGg2HziROwEXyDwWAwGAwGg8FgMBgMBoPBYDAYDAaDwWAwGAwGg8FgMBgMBoPBYDAYDAaDwWAwGAwGg8FgMBgMBoPBYDAYDAaDwWAwGAwGg8FgMBgMBoPBYDAYDAaDwWAwGAwGg8FgMBgMBoPBYDAYDAaDwWAwGAwGg8FgMBgMBoPBYDAYDAaDwWAwGAwGg8FgMBgMBoPBYDAYDAaDwWAwGAwGg8FgMBgMBoPBYDAYDAaDwWAwGAwGg8FgMBgMBoPBYDAYDAaDwWAwGAwGg8FgMBgMBoPBYDAYDAaDwWAwGAwGg8FgMBgMBoPBsGH4f5kQR3YyWEAhAAAAAElFTkSuQmCC';
/* 서버 API 접근 토큰 (index.html의 meta[name=et]에 서버가 주입; 없으면 오프라인) */
function eTok(){ try{ var m=document.querySelector('meta[name="et"]'); var v=(m&&m.getAttribute('content'))||''; return v.indexOf('%')>=0?'':v; }catch(e){ return ''; } }
/* 반(TIERS) 안전 조회 — 저장된 값이 A/B/C 가 아니어도 화면이 죽지 않게 합니다 */
function tierOf(c){ return (c && typeof TIERS!=='undefined' && TIERS[c]) ? TIERS[c] : {name:'미배정', sub:'', color:'#94a3b8', min:0}; }
function tierName(c){ return c ? tierOf(c).name : '미배정'; }
function tierColor(c){ return c ? tierOf(c).color : '#94a3b8'; }
function eHdr(extra){ var h=Object.assign({},extra||{}); var tk=eTok(); if(tk) h['x-eroom-token']=tk;
  var sk=eSess(); if(sk) h['x-eroom-sess']=sk; return h; }
/* 로그인 세션 토큰 — 서버가 이 값을 보고 내려줄 데이터 범위를 정합니다 */
function eSess(){ try{ return sessionStorage.getItem('eroom_sess')||''; }catch(e){ return ''; } }
function eSessSet(t){ try{ if(t) sessionStorage.setItem('eroom_sess',t); else sessionStorage.removeItem('eroom_sess'); }catch(e){} }

function load(){ try { return JSON.parse(localStorage.getItem(LS_KEY)) || null; } catch(e){ return null; } }
/* 서버에서 받은 데이터에 빠진 목록이 있어도 화면이 멈추지 않도록 모양을 맞춥니다.
   (역할에 따라 서버가 일부만 내려주는 경우가 있습니다) */
const SHAPE_ARR = ['students','instructors','admins','lectures','cohorts','assigns','assessments',
  'notices','materials','calEvents','sessions','levelTests','mockExams','assignments','schedules',
  'questionsToTeacher','qna','holidays','submissions','certs','kakaoLog','recordings',
  /* 토익 학원 */ 'toeicQ','toeicSets','toeicSessions','toeicExams','toeicDates','toeicCuts','toeicVoca'];
const SHAPE_OBJ = ['scores','watch','vocab','idiom','notes','wrongMemo','dailyTests','presence',
  'ltGrants','config','routine','levelTest','kakao','diligence','dailyDone','attendance','memos',
  /* 토익 학원 */ 'toeicConf','toeicGoal','toeicWrong','toeicWord'];
function ensureShape(d){
  if(!d || typeof d!=='object') return d;
  SHAPE_ARR.forEach(function(k){ if(!Array.isArray(d[k])) d[k] = []; });
  SHAPE_OBJ.forEach(function(k){ if(!d[k] || typeof d[k]!=='object' || Array.isArray(d[k])) d[k] = {}; });
  return d;
}
const SYNC_COLS=['students','instructors','admins','lectures','cohorts','assigns','assessments','notices','materials','calEvents'];
var KAKAO_REPORT_ON = false; /* 카카오 알림톡 연동 오픈 시 true */
const SYNC_OBJ=['levelTest','ltGrants','routine'];
function snapKeyBody(o){ var c={}; for(var k in o){ if(k!=='_u') c[k]=o[k]; } return JSON.stringify(c); }
function stampChanges(){
  try{
    var prev = window.__eSnap, now = Date.now(), cur = {};
    SYNC_COLS.forEach(function(col){
      (DB[col]||[]).forEach(function(o){
        if(!o || o.id==null) return;
        var key=col+':'+o.id, body=snapKeyBody(o);
        cur[key]=body;
        if(!prev) return;                                   /* 최초 스냅샷: 스탬프 없음 */
        if(prev[key]===undefined) o._u=now;                  /* 신규 레코드 */
        else if(prev[key]!==body) o._u=now;                  /* 변경된 레코드 */
      });
    });
    window.__eSnap=cur;
  }catch(e){}
}
function resetSnap(){ window.__eSnap=null; stampChanges(); try{ if(typeof acSeenReset==='function') acSeenReset(); }catch(e){} }
function save(){ try{ if(typeof sanitizeBeforeSave==='function') sanitizeBeforeSave(); }catch(e){} try{ if(typeof acStampNew==='function') acStampNew(); }catch(e){} stampChanges(); try{ localStorage.setItem(LS_KEY, JSON.stringify(DB)); }catch(e){} if(typeof Net!=='undefined' && Net.push) Net.push(); }
let DB = load();

function seed(){
  if (DB) return;
  DB = {
    instructors:[
      {id:'i1', ac:'transfer', name:'이룸 강사', username:'eroom_teacher', pw:'teacher', email:'teacher@eroom.kr', phone:'010-1000-0001'}
    ],
    admins:[ {id:'a1', name:'관리자', username:'eroom_master', pw:'bigstu'} ],
    students:[
      {id:'s1', ac:'transfer', name:'최재현', username:'E_choi', pw:'1234', cls:'A', instructorId:'i1', email:'choi@stu.kr', phone:'010-2000-0001', goalSchool:'연세대', goalDept:'경영학과', memo:'상위권, 논리 보강 필요', createdAt:'2026-03-02'},
      {id:'s2', ac:'transfer', name:'이서영', username:'E_lee', pw:'12345', cls:null, instructorId:'i1', email:'lee@stu.kr', phone:'010-2000-0002', goalSchool:'', goalDept:'', memo:'신규 · 레벨테스트 대기', createdAt:'2026-06-01'}
    ],
    schedules:{}, recordings:{}, attendance:{}, levelTests:[], sessions:[], memos:{}
  };
  DB.levelTests.push({id:'lt1', ac:'transfer', studentId:'s1', name:'최재현', score:34, rate:85, cls:'A', sections:{vocab:9,grammar:9,reading:8,logic:8}, goalSchool:'연세대', goalDept:'경영학과', date:'2026-03-02'});
  const today = todayStr();
  DB.schedules[today] = { 1:{time:'09:00~09:50', title:'어휘 - 동의어 유형', zoom:'https://zoom.us/j/1111', instructorId:'i1'}, 2:{time:'10:00~10:50', title:'문법 - 수일치/시제', zoom:'https://zoom.us/j/2222', instructorId:'i1'}, 3:{time:'11:00~11:50', title:'논리 - 연결어 추론', zoom:'https://zoom.us/j/3333', instructorId:'i1'} };
  seedAttendance();
  save();
}
function seedAttendance(){
  const profiles = { s1:[0.95,0.04], s2:[0.88,0.08] };
  for(let i=1;i<=21;i++){
    const dt=new Date(); dt.setDate(dt.getDate()-i); const dow=dt.getDay(); if(dow===0||dow===6) continue;
    const ds=todayStr(dt); DB.attendance[ds]=DB.attendance[ds]||{};
    for(const sid of Object.keys(profiles)){
      DB.attendance[ds][sid]=DB.attendance[ds][sid]||{};
      for(const p of PERIODS){ const r=Math.random(); const pp=profiles[sid][0], lp=profiles[sid][1]; DB.attendance[ds][sid][p.p]= r<pp?'present': r<pp+lp?'late':'absent'; }
    }
  }
}
function migrate(){
  if(!DB) return;
  if(!DB.attendance) DB.attendance={};
  if(Object.keys(DB.attendance).length===0){ seedAttendance(); save(); }
}
function attitude(studentId){
  let p=0,l=0,a=0;
  for(const date in DB.attendance){ const rec=DB.attendance[date] && DB.attendance[date][studentId]; if(!rec) continue;
    for(const k in rec){ const v=rec[k]; if(v==='present')p++; else if(v==='late')l++; else if(v==='absent')a++; } }
  const total=p+l+a; const score= total? Math.round((p*100+l*60)/total):null;
  const label = score==null?'데이터 없음': score>=90?'매우 성실': score>=75?'성실': score>=60?'보통':'관리 필요';
  return { present:p, late:l, absent:a, total, score, label };
}

function todayStr(d){ d = d||new Date();
  if(!(d instanceof Date) || isNaN(d.getTime())) d = new Date();     /* 잘못된 날짜가 들어와도 오늘로 대체 */
  const o=d.getTimezoneOffset(); return new Date(d-o*60000).toISOString().slice(0,10); }
function uid(p){ return p + Math.random().toString(36).slice(2,8); }
function el(html){ const t=document.createElement('template'); t.innerHTML=html.trim(); return t.content.firstChild; }
function $(s, r){ return (r||document).querySelector(s); }
function $$(s, r){ return Array.from((r||document).querySelectorAll(s)); }
function esc(s){ return (s==null?'':String(s)).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
function shuffle(a){ a=a.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); const t=a[i]; a[i]=a[j]; a[j]=t; } return a; }
function addDays(n,base){
  var d = base ? new Date(String(base).slice(0,10)+'T00:00:00') : new Date();
  if(isNaN(d.getTime())) d = new Date();          /* 개강일 등이 비었거나 형식이 깨져도 죽지 않게 */
  d.setDate(d.getDate() + (parseInt(n,10)||0)); return todayStr(d); }
function acctExpired(acc){ return !!(acc && acc.validUntil && todayStr()>acc.validUntil); }
function classOf(rate){ return rate>=80?'A':rate>=60?'B':'C'; }
function pct(n){ return Math.round(n)+'%'; }
function fmtNum(n){ return (n||0).toLocaleString(); }

let CURRENT = null;
function loginAs(role, id, name){ CURRENT={role:role,id:id,name:name}; sessionStorage.setItem('eroom_cur', JSON.stringify(CURRENT)); }
function logout(){
  try{ if(typeof markLogout==='function') markLogout(); }catch(e){}
  /* 예약된 저장을 먼저 서버로 보내고, 끝난 뒤에 새로고침합니다.
     (저장 직후 로그아웃하면 방금 바꾼 내용이 사라지던 문제를 막습니다) */
  var done = false;
  function finish(){
    if(done) return; done = true;
    CURRENT=null;
    try{ sessionStorage.removeItem('eroom_cur'); }catch(e){}
    eSessSet('');
    location.reload();
  }
  try{
    if(typeof Net!=='undefined' && Net.flush){
      Net.flush().then(finish, finish);
      setTimeout(finish, 2000);          /* 서버가 느려도 2초 뒤에는 반드시 나갑니다 */
      return;
    }
  }catch(e){}
  setTimeout(finish, 120);
}
function restore(){ try{ CURRENT=JSON.parse(sessionStorage.getItem('eroom_cur')); }catch(e){} }

function bySection(sec, level){ return QUESTIONS.filter(function(q){ return q.section===sec && (level==null || q.level===level); }); }
/* 출제할 때마다 보기 순서를 섞어 같은 문제도 매번 다르게 보이도록 한다 */
function varyOptions(q){
  if(!q || !q.options || q.options.length < 3) return q;
  var idx = q.options.map(function(_, i){ return i; });
  for(var i=idx.length-1; i>0; i--){ var j=Math.floor(Math.random()*(i+1)); var t=idx[i]; idx[i]=idx[j]; idx[j]=t; }
  var c = {};
  for(var k in q) if(Object.prototype.hasOwnProperty.call(q,k)) c[k]=q[k];
  c.options = idx.map(function(i2){ return q.options[i2]; });
  c.answer  = idx.indexOf(q.answer);
  c._varied = true;
  return c;
}
function varySet(list){ return (list||[]).map(varyOptions); }
function pickQuestions(sec, n, level){ return varySet(shuffle(bySection(sec, level)).slice(0,n)); }
function levelTestSet(){ let set=[]; for(const s of ['vocab','grammar','reading','logic']){ set = set.concat(shuffle(bySection(s)).slice(0,10)); } return varySet(set); }


/* ---------- 공용 첨부 업로드 (사진/PDF/문서 · 최대 100MB) ---------- */
var UPLOAD_MAX_MB = 100;
function fmtMB(n){ n=+n||0; return n>=1048576 ? (n/1048576).toFixed(1)+'MB' : Math.max(1,Math.round(n/1024))+'KB'; }
function uploadPick(inputId, statusId, cb, opt){
  opt = opt || {};
  var maxMB = opt.maxMB || UPLOAD_MAX_MB;
  var inp = document.getElementById(inputId), stx = document.getElementById(statusId);
  var f = ((inp||{}).files||[])[0];
  if(!f){ if(stx) stx.textContent='파일을 먼저 선택해 주세요'; return; }
  if(f.size > maxMB*1024*1024){ if(stx) stx.textContent='최대 '+maxMB+'MB까지 첨부할 수 있습니다 (현재 '+fmtMB(f.size)+')'; return; }
  function setMsg(t){ if(stx) stx.textContent=t; }
  function setProg(p){ if(stx) stx.innerHTML='업로드 중 '+p+'% <span class="up-bar"><i style="width:'+p+'%"></i></span> '+esc(f.name)+' ('+fmtMB(f.size)+')'; }

  /* 1) 대용량·일반 파일: 바이너리 스트리밍 업로드(진행률 표시) */
  function rawUpload(){
    return new Promise(function(res, rej){
      var xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/upload-raw', true);
      try{ var t = (typeof eTok==='function') ? eTok() : ''; if(t) xhr.setRequestHeader('x-eroom-token', t); }catch(e){}
      xhr.setRequestHeader('content-type', 'application/octet-stream');
      xhr.setRequestHeader('x-file-name', encodeURIComponent(f.name));
      xhr.upload.onprogress = function(ev){ if(ev.lengthComputable) setProg(Math.round(ev.loaded/ev.total*100)); };
      xhr.onload = function(){
        var j = null; try{ j = JSON.parse(xhr.responseText||'{}'); }catch(e){}
        if(xhr.status===200 && j && j.ok) res(j); else rej(new Error((j&&j.error)||('HTTP '+xhr.status)));
      };
      xhr.onerror = function(){ rej(new Error('network')); };
      setProg(0);
      xhr.send(f);
    });
  }
  /* 2) 폴백: base64 JSON 업로드 */
  function b64Upload(){
    return new Promise(function(res, rej){
      var rd = new FileReader();
      rd.onload = function(){
        fetch('/api/upload',{method:'POST',headers:eHdr({'content-type':'application/json'}),body:JSON.stringify({name:f.name,data:rd.result})})
          .then(function(x){ return x.json(); })
          .then(function(j){ if(j&&j.ok) res(j); else rej(new Error((j&&j.error)||'서버 오류')); })
          .catch(function(){ rej(new Error('network')); });
      };
      rd.onerror = function(){ rej(new Error('read')); };
      setMsg('업로드 준비 중...');
      rd.readAsDataURL(f);
    });
  }
  rawUpload()
    .catch(function(){ setMsg('다시 시도하는 중...'); return b64Upload(); })
    .then(function(j){ setMsg('첨부 완료 · '+f.name+' ('+fmtMB(f.size)+')'); cb && cb(j.url, f.name, f.size); })
    .catch(function(e){ setMsg('업로드 실패: '+(e&&e.message==='network' ? '서버에 연결할 수 없습니다' : (e&&e.message)||'오류')); });
}

/* ---------- 레벨테스트 개방(월별 실시) 권한 ---------- */
function ltCfg(){
  DB.levelTest = DB.levelTest || { open:false, from:'', to:'', target:'all', classes:[], studentIds:[], note:'' };
  return DB.levelTest;
}
function ltInWindow(cfg, d){
  d = d || todayStr();
  if(cfg.from && d < cfg.from) return false;
  if(cfg.to   && d > cfg.to)   return false;
  return true;
}
/* 학생이 지금 레벨테스트를 볼 수 있는지 */
function ltAllowed(stu, role){
  role = role || (CURRENT && CURRENT.role);
  if(role === 'test') return { ok:true, why:'체험 진단 계정' };          /* 체험 계정은 상시 응시 */
  if(role === 'admin' || role === 'instructor') return { ok:true, why:'관리자 확인' };
  var cfg = ltCfg();
  /* 개별 임시 허용(1회권) */
  var g = (DB.ltGrants||{})[stu && stu.id];
  if(g && (!g.until || todayStr() <= g.until) && !g.usedAt) return { ok:true, why:'개별 응시 허용', grant:true };
  if(!cfg.open) return { ok:false, why:'현재 레벨테스트 기간이 아닙니다', cfg:cfg };
  if(!ltInWindow(cfg)) return { ok:false, why:'레벨테스트 응시 기간이 아닙니다', cfg:cfg };
  if(cfg.target === 'class'){
    if(!stu || !stu.cls || (cfg.classes||[]).indexOf(stu.cls) < 0) return { ok:false, why:'이번 회차 응시 대상이 아닙니다', cfg:cfg };
  }
  if(cfg.target === 'select'){
    if(!stu || (cfg.studentIds||[]).indexOf(stu.id) < 0) return { ok:false, why:'이번 회차 응시 대상이 아닙니다', cfg:cfg };
  }
  return { ok:true, why:'응시 기간', cfg:cfg };
}
function ltWindowText(){
  var c = ltCfg();
  if(!c.open) return '';
  if(c.from && c.to) return c.from + ' ~ ' + c.to;
  if(c.from) return c.from + '부터';
  if(c.to) return c.to + '까지';
  return '상시 개방';
}
function ltUseGrant(sid){
  if(DB.ltGrants && DB.ltGrants[sid]){ DB.ltGrants[sid].usedAt = todayStr(); save(); }
}

/* ---------- 접속 상태(온라인/오프라인) 추적 ---------- */
function markPresence(){
  if(!CURRENT || !CURRENT.id) return;
  DB.presence = DB.presence || {};
  var now = Date.now();
  var prev = DB.presence[CURRENT.id] || {};
  DB.presence[CURRENT.id] = {
    id: CURRENT.id, role: CURRENT.role, name: CURRENT.name,
    last: now, since: prev.since || now, out: false, _u: now
  };
  try{ localStorage.setItem(LS_KEY, JSON.stringify(DB)); }catch(e){}
  if(typeof Net!=='undefined' && Net.push) Net.push();
}
/* 페이지를 닫거나 새로고침할 때 — 디바운스를 건너뛰고 즉시 서버로 보낸다 */
function pushPresenceNow(rec){
  try{
    var body = JSON.stringify({ presence: (function(){ var o={}; o[rec.id]=rec; return o; })() });
    var url = '/api/state';
    var tk = (typeof eTok==='function') ? eTok() : '';
    if(navigator.sendBeacon && !tk){ navigator.sendBeacon(url, new Blob([body],{type:'application/json'})); return; }
    var x = new XMLHttpRequest();
    x.open('PUT', url, false);                       /* 창이 닫히기 전에 전송을 보장 */
    x.setRequestHeader('content-type','application/json');
    if(tk) x.setRequestHeader('x-eroom-token', tk);
    x.send(body);
  }catch(e){}
}
function markLogout(){
  if(!CURRENT || !CURRENT.id) return;
  DB.presence = DB.presence || {};
  var p = DB.presence[CURRENT.id] || {};
  DB.presence[CURRENT.id] = { id:CURRENT.id, role:CURRENT.role, name:CURRENT.name,
    last: Date.now(), since: p.since || Date.now(), out: true, _u: Date.now() };
  try{ localStorage.setItem(LS_KEY, JSON.stringify(DB)); }catch(e){}
  pushPresenceNow(DB.presence[CURRENT.id]);
  if(typeof Net!=='undefined' && Net.push) Net.push();
}
/* 접속 상태 판정: 3분 이내 활동 = 접속 중 */
function presenceOf(userId){
  var p = (DB.presence||{})[userId];
  if(!p || p.out) return { on:false, last:(p&&p.last)||0 };
  var gap = Date.now() - (p.last||0);
  return { on: gap < 180000, last: p.last||0, gap:gap };
}
function presenceText(userId){
  var p = presenceOf(userId);
  if(p.on) return '접속 중';
  if(!p.last) return '기록 없음';
  var raw = (DB.presence||{})[userId] || {};
  var m = Math.floor((Date.now()-p.last)/60000);
  if(raw.out && m < 1) return '로그아웃';
  if(m < 1) return '방금 전';
  if(m < 60) return m + '분 전';
  var h = Math.floor(m/60);
  if(h < 24) return h + '시간 전';
  return Math.floor(h/24) + '일 전';
}
